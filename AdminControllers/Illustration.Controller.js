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

// Helper function to convert UTC to IST for frontend
const formatUTCToIST = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istDate = new Date(new Date(date).getTime() + istOffset);
  return istDate.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm
};

// Schedule illustration activation and status update
const cron = require("node-cron");
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date(); // Current time in UTC

    // Activate illustrations with startTime
    const illustrationsToActivate = await Illustration.findAll({
      where: {
        status: 0,
        startTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: now },
          ],
        },
      },
    });

    for (const illustration of illustrationsToActivate) {
      await illustration.update({
        status: 1,
      });
      logger.info(
        `Illustration ID ${illustration.id} published at ${formatUTCToIST(now)}.`
      );
    }

    // Unpublish illustrations that have reached endTime
    const illustrationsToUnpublish = await Illustration.findAll({
      where: {
        status: 1,
        endTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: now },
          ],
        },
      },
    });

    for (const illustration of illustrationsToUnpublish) {
      await illustration.update({
        status: 0,
      });
      logger.info(
        `Illustration ID ${illustration.id} unpublished at ${formatUTCToIST(now)}.`
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

    const parseDate = (dateString, fieldName) => {
      if (dateString === undefined || dateString === "") {
        logger.warn(`Empty or undefined ${fieldName} received for ${id ? `illustration ${id}` : "new illustration"}; preserving existing value`);
        return undefined; // Signal to preserve existing value
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName} format`);
      }
      return date; // Store in UTC
    };

    const startDate = parseDate(startTime, "startTime");
    const endDate = parseDate(endTime, "endTime");

    const now = new Date(); // Current time in UTC

    if (endDate && endDate <= now) {
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

    let effectiveStatus = statusValue;
    if (startDate && startDate > now) {
      effectiveStatus = 0; // Force unpublished if start date is in the future
    } else if (startDate && startDate <= now) {
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
        startTime: startDate !== undefined ? startDate : illustration.startTime,
        endTime: endDate !== undefined ? endDate : illustration.endTime,
      });

      logger.info(`Illustration ${id} updated successfully.`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration updated successfully.",
        illustration: {
          ...illustration.toJSON(),
          startTime: formatUTCToIST(illustration.startTime),
          endTime: formatUTCToIST(illustration.endTime),
        },
      });
    } else {
      illustration = await Illustration.create({
        screenName,
        img: imageUrl,
        status: effectiveStatus,
        startTime: startDate,
        endTime: endDate,
      });

      logger.info(`New illustration created with ID ${illustration.id}.`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration created successfully.",
        illustration: {
          ...illustration.toJSON(),
          startTime: formatUTCToIST(illustration.startTime),
          endTime: formatUTCToIST(illustration.endTime),
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
      startTime: formatUTCToIST(illustration.startTime),
      endTime: formatUTCToIST(illustration.endTime),
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
      startTime: formatUTCToIST(illustration.startTime),
      endTime: formatUTCToIST(illustration.endTime),
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

    const now = new Date(); // Current time in UTC
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
      if (startDate && startDate > now) {
        logger.error(`Cannot toggle status to Published for illustration ID ${id} with future startTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for an illustration with a future startTime. It will be published automatically when the startTime is reached.",
        });
      }
      if (endDate && endDate <= now) {
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
    logger.info(`Illustration status updated for ID ${illustration.id} to ${statusValue}.`);
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Illustration status updated successfully.",
      updatedStatus: illustration.status,
      startTime: formatUTCToIST(illustration.startTime),
      endTime: formatUTCToIST(illustration.endTime),
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