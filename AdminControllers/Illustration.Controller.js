const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const Illustration = require("../Models/Illustration");
const { Sequelize } = require("sequelize");

// Verify Illustration model is defined
if (!Illustration || typeof Illustration.create !== "function") {
  logger.error("Illustration model is not properly defined or exported");
  throw new Error("Illustration model is not properly defined or exported");
}

// Log server timezone for debugging
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Helper function to convert UTC to IST
const convertUTCToIST = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(new Date(date).getTime() + istOffset);
};

// Schedule illustration activation and status update
const cron = require("node-cron");
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);

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
      await illustration.update({
        status: 1,
        // Explicitly do not clear startTime to preserve it
      });
      logger.info(
        `Illustration ID ${illustration.id} published at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `startTime preserved: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
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
      await illustration.update({
        status: 0,
        // Explicitly do not clear endTime to preserve it
      });
      logger.info(
        `Illustration ID ${illustration.id} unpublished at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `endTime preserved: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }
  } catch (error) {
    logger.error(`Error in illustration scheduling job: ${error.message}`);
  }
});

const upsertIllustration = asyncHandler(async (req, res, next) => {
  try {
    const { id, screenName, status, startTime, endTime } = req.body;
    let imageUrl;

    // Check if file is provided
    if (req.file) {
      imageUrl = await uploadToS3(req.file, "image");
    } else if (!id) {
      logger.error("Image is required for a new illustration");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Image is required for a new illustration.",
      });
    }

    const statusValue = parseInt(status, 10);
    const validStatuses = [0, 1];
    if (!validStatuses.includes(statusValue)) {
      logger.error("Invalid status value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published).",
      });
    }

    const parseISTDate = (dateString, fieldName) => {
      if (dateString === undefined || dateString === "") {
        logger.warn(`Empty or undefined ${fieldName} received for ${id ? `illustration ${id}` : "new illustration"}; preserving existing value`);
        return undefined; // Signal to preserve existing value
      }
      const istDate = new Date(dateString);
      if (isNaN(istDate.getTime())) {
        throw new Error(`Invalid ${fieldName} format`);
      }
      return istDate;
    };

    const convertISTToUTC = (date) => {
      if (!date) return null;
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(date.getTime() - istOffset);
    };

    const startDate = parseISTDate(startTime, "startTime");
    const endDate = parseISTDate(endTime, "endTime");

    const nowInIST = new Date();

    logger.info(`Current time in IST: ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    if (startDate) {
      logger.info(`Parsed startTime (IST): ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
    if (endDate) {
      logger.info(`Parsed endTime (IST): ${endDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    if (endDate && endDate <= nowInIST) {
      logger.error("End time must be in the future");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End time must be in the future.",
      });
    }
    if (startDate && endDate && startDate >= endDate) {
      logger.error("End time must be greater than start time");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End time must be greater than start time.",
      });
    }

    const adjustedStartTime = startDate ? convertISTToUTC(startDate) : null;
    const adjustedEndTime = endDate ? convertISTToUTC(endDate) : null;

    let effectiveStatus = statusValue;
    if (startDate && startDate > nowInIST) {
      effectiveStatus = 0; // Force unpublished if start date is in the future
    } else if (startDate && startDate <= nowInIST) {
      effectiveStatus = 1; // Auto-publish if start date has passed
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
        img: imageUrl || illustration.img,
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
    res.status(200).json({
      ...illustration.toJSON(),
      startTime: convertUTCToIST(illustration.startTime),
      endTime: convertUTCToIST(illustration.endTime),
    });
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
    const illustrationsWithIST = illustrations.map(illustration => ({
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
  const { id, value, startTime, endTime } = req.body;
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
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);
    const startDate = illustration.startTime ? new Date(illustration.startTime) : null;
    const endDate = illustration.endTime ? new Date(illustration.endTime) : null;

    // Log if startTime or endTime were included in the request
    if (startTime !== undefined) {
      logger.warn(`startTime (${startTime}) included in toggleIllustrationStatus for illustration ${id}; ignoring to preserve existing value`);
    }
    if (endTime !== undefined) {
      logger.warn(`endTime (${endTime}) included in toggleIllustrationStatus for illustration ${id}; ignoring to preserve existing value`);
    }

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
    // Explicitly do not clear or modify startTime or endTime
    await illustration.save();
    logger.info(
      `Illustration status updated for ID ${illustration.id} to ${statusValue}. ` +
      `startTime preserved: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
      `endTime preserved: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
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