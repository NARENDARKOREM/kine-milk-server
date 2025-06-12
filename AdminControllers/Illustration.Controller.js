const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const Illustration = require("../Models/Illustration");
const { Sequelize } = require("sequelize");
const cron = require("node-cron");
const { sanitizeFilename } = require("../utils/multerConfig");

// Verify Illustration model is defined
if (!Illustration || typeof Illustration.create !== "function") {
  logger.error("Illustration model is not properly defined or exported");
  throw new Error("Illustration model is not properly defined or exported");
}

// Log server timezone for debugging
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Helper function to convert UTC to IST for response and logging
const convertUTCToIST = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(new Date(date).getTime() + istOffset);
};

// Helper function to convert IST to UTC for database storage
const convertISTToUTC = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() - istOffset);
};

// Schedule illustration activation and status update
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    const nowInUTC = convertISTToUTC(nowInIST);

    logger.info(`Cron job running at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (UTC: ${nowInUTC.toISOString()})`);

    // Activate illustrations with startTime
    const illustrationsToActivate = await Illustration.findAll({
      where: {
        status: 0,
        startTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const illustration of illustrationsToActivate) {
      await illustration.update({ status: 1 }); // Preserve startTime
      logger.info(
        `Illustration ID ${illustration.id} published at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `startTime: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }

    // Unpublish illustrations that have reached endTime
    const illustrationsToUnpublish = await Illustration.findAll({
      where: {
        status: 1,
        endTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const illustration of illustrationsToUnpublish) {
      await illustration.update({ status: 0 }); // Preserve endTime
      logger.info(
        `Illustration ID ${illustration.id} unpublished at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `endTime: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }
  } catch (error) {
    logger.error(`Error in illustration scheduling job: ${error.message}`);
  }
});

const upsertIllustration = asyncHandler(async (req, res) => {
  try {
    const { id, screenName, status, startTime, endTime } = req.body;
    let imageUrl = null;

    // Log incoming request data
    logger.info(`Upsert request for illustration ${id || "new"}: ${JSON.stringify(req.body)}`);
    if (req.file) logger.info(`File uploaded: ${req.file.originalname}`);

    // Handle file upload
    if (req.file) {
      req.file.originalname = sanitizeFilename(req.file.originalname);
      imageUrl = await uploadToS3(req.file, "image");
      if (!imageUrl) {
        logger.error("Image upload failed");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Image upload failed.",
        });
      }
    } else if (id) {
      const existingIllustration = await Illustration.findByPk(id);
      if (!existingIllustration) {
        logger.error(`Illustration with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Illustration not found.",
        });
      }
      imageUrl = existingIllustration.img; // Preserve existing image
    } else {
      logger.error("Image is required for a new illustration");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Image is required for a new illustration.",
      });
    }

    // Validate status
    const statusValue = parseInt(status, 10);
    const validStatuses = [0, 1];
    if (!validStatuses.includes(statusValue)) {
      logger.error(`Invalid status value: ${status}`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published).",
      });
    }

    // Parse and validate dates
    const parseISTDate = (dateString, fieldName) => {
      if (dateString === "" || dateString === null) {
        logger.info(`Clearing ${fieldName} for illustration ${id || "new"}`);
        return null;
      }
      if (dateString) {
        const istDate = new Date(dateString);
        if (isNaN(istDate.getTime())) {
          logger.error(`Invalid ${fieldName} format: ${dateString}`);
          throw new Error(`Invalid ${fieldName} format`);
        }
        logger.info(`${fieldName} parsed (IST): ${istDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
        return istDate;
      }
      return undefined; // Preserve existing value
    };

    const startDate = parseISTDate(startTime, "startTime");
    const endDate = parseISTDate(endTime, "endTime");

    const nowInIST = new Date();
    logger.info(`Current time in IST: ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);

    // Validate dates
    if (endDate && endDate <= nowInIST) {
      logger.error("End time must be in the future");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End time must be in the future.",
      });
    }
    if (startDate && endDate && startDate >= endDate) {
      logger.error("End time must be after start time");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End time must be after start time.",
      });
    }

    const adjustedStartTime = startDate !== undefined ? convertISTToUTC(startDate) : null;
    const adjustedEndTime = endDate !== undefined ? convertISTToUTC(endDate) : null;

    // Adjust status based on startTime
    let effectiveStatus = statusValue;
    if (startDate && startDate > nowInIST) {
      effectiveStatus = 0; // Force unpublished if start date is in the future
      logger.info(`Forcing status to 0 for future startTime: ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    } else if (startDate && startDate <= nowInIST) {
      effectiveStatus = 1; // Auto-publish if start date has passed
      logger.info(`Auto-publishing due to past startTime: ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    let illustration;
    if (id) {
      illustration = await Illustration.findByPk(id);
      if (!illustration) {
        logger.error(`Illustration with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Illustration not found.",
        });
      }

      await illustration.update({
        screenName,
        img: imageUrl,
        status: effectiveStatus,
        startTime: startDate !== undefined ? adjustedStartTime : illustration.startTime,
        endTime: endDate !== undefined ? adjustedEndTime : illustration.endTime,
      });

      logger.info(
        `Illustration ${id} updated successfully. ` +
        `Status: ${effectiveStatus}, ` +
        `startTime: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `endTime: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration updated successfully.",
        illustration: {
          ...illustration.toJSON(),
          startTime: convertUTCToIST(illustration.startTime),
          endTime: convertUTCToIST(illustration.endTime),
        },
      });
    } else {
      illustration = await Illustration.create({
        screenName,
        img: imageUrl,
        status: effectiveStatus,
        startTime: adjustedStartTime,
        endTime: adjustedEndTime,
      });

      logger.info(
        `New illustration created with ID ${illustration.id}. ` +
        `Status: ${effectiveStatus}, ` +
        `startTime: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `endTime: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration created successfully.",
        illustration: {
          ...illustration.toJSON(),
          startTime: convertUTCToIST(illustration.startTime),
          endTime: convertUTCToIST(illustration.endTime),
        },
      });
    }
  } catch (error) {
    logger.error(`Error processing illustration: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const fetchIllustrationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const illustration = await Illustration.findByPk(id);
    if (!illustration) {
      logger.error(`Illustration with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Illustration not found",
      });
    }
    logger.info(`Illustration fetched by ID ${id}`);
    const illustrationWithIST = {
      ...illustration.toJSON(),
      startTime: convertUTCToIST(illustration.startTime),
      endTime: convertUTCToIST(illustration.endTime),
    };
    res.status(200).json(illustrationWithIST);
  } catch (error) {
    logger.error(`Error fetching illustration by ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error at fetch illustration",
    });
  }
});

const fetchIllustrations = asyncHandler(async (req, res) => {
  try {
    const illustrations = await Illustration.findAll();
    logger.info("Successfully fetched all illustrations");
    const illustrationsWithIST = illustrations.map((illustration) => ({
      ...illustration.toJSON(),
      startTime: convertUTCToIST(illustration.startTime),
      endTime: convertUTCToIST(illustration.endTime),
    }));
    res.status(200).json(illustrationsWithIST);
  } catch (error) {
    logger.error(`Error fetching illustrations: ${error.message}`);
    res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Failed to fetch illustrations",
    });
  }
});

const deleteIllustrationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { forceDelete } = req.body;

  try {
    const illustration = await Illustration.findOne({ where: { id }, paranoid: false });

    if (!illustration) {
      logger.error(`Illustration with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Illustration not found",
      });
    }

    if (illustration.deletedAt && forceDelete !== "true") {
      logger.error(`Illustration ID ${id} is already soft-deleted`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Illustration is already soft-deleted. Use forceDelete=true to permanently delete it.",
      });
    }

    if (forceDelete === "true") {
      await Illustration.destroy({ where: { id }, force: true });
      logger.info(`Illustration with ID ${id} permanently deleted`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration permanently deleted successfully",
      });
    }

    await Illustration.destroy({ where: { id } });
    logger.info(`Illustration ID ${id} soft-deleted`);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Illustration soft deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting illustration with ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const toggleIllustrationStatus = asyncHandler(async (req, res) => {
  const { id, value } = req.body;
  try {
    const illustration = await Illustration.findByPk(id);
    if (!illustration) {
      logger.error(`Illustration with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Illustration not found.",
      });
    }

    const nowInIST = new Date();
    const nowInUTC = convertISTToUTC(nowInIST);
    const startDate = illustration.startTime ? new Date(illustration.startTime) : null;
    const endDate = illustration.endTime ? new Date(illustration.endTime) : null;

    // Prevent toggling to Published if startTime is future or endTime has passed
    if (value === 1) {
      if (startDate && startDate > nowInUTC) {
        logger.error(`Cannot toggle status to Published for illustration ID ${id} with future startTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for an illustration with a future startTime. It will be published automatically when the startTime is reached.",
        });
      }
      if (endDate && endDate <= nowInUTC) {
        logger.error(`Cannot toggle status to Published for illustration ID ${id} with expired endTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for an illustration with an expired endTime. Please edit the illustration to update the endTime.",
        });
      }
    }

    const statusValue = parseInt(value, 10);
    const validStatuses = [0, 1];
    if (!validStatuses.includes(statusValue)) {
      logger.error(`Invalid status value: ${value}`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published).",
      });
    }

    illustration.status = statusValue;
    await illustration.save();
    logger.info(
      `Illustration status updated for ID ${id} to ${statusValue}. ` +
      `startTime: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
      `endTime: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
    );
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Illustration status updated successfully.",
      updatedStatus: illustration.status,
      startTime: convertUTCToIST(illustration.startTime),
      endTime: convertUTCToIST(illustration.endTime),
    });
  } catch (error) {
    logger.error(`Error updating illustration status for ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error.",
    });
  }
});

module.exports = {
  upsertIllustration,
  fetchIllustrationById,
  fetchIllustrations,
  deleteIllustrationById,
  toggleIllustrationStatus,
};