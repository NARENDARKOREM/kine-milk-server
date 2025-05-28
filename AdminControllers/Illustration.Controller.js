const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const Illustration = require("../Models/Illustration");

// Verify Illustration model is defined
if (!Illustration || typeof Illustration.create !== "function") {
  logger.error("Illustration model is not properly defined or exported");
  throw new Error("Illustration model is not properly defined or exported");
}

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
    const validStatuses = [0, 1, 2];
    if (!validStatuses.includes(statusValue)) {
      logger.error("Invalid status value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished), 1 (Published), or 2 (Scheduled).",
      });
    }

    const currentTime = new Date(); // Current time for comparison

    // Validate startTime and endTime for Scheduled status
    if (statusValue === 2) {
      if (!startTime) {
        logger.error("startTime is required for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "startTime is required when status is Scheduled.",
        });
      }
      if (!endTime) {
        logger.error("endTime is required for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "endTime is required when status is Scheduled.",
        });
      }

      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      // startTime must be in the future
      if (startDate <= currentTime) {
        logger.error("startTime must be in the future for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "startTime must be in the future for Scheduled status.",
        });
      }

      // endTime must be greater than startTime
      if (endDate <= startDate) {
        logger.error("endTime must be greater than startTime for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "endTime must be greater than startTime for Scheduled status.",
        });
      }
    }

    // Validate endTime for Published status if provided
    if (statusValue === 1 && endTime) {
      const endDate = new Date(endTime);
      if (endDate <= currentTime) {
        logger.error("endTime must be in the future for Published status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "endTime must be in the future if provided for Published status.",
        });
      }
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

      // Update illustration details
      await illustration.update({
        screenName,
        img: imageUrl || illustration.img,
        status: statusValue,
        startTime: statusValue === 2 ? startTime : null,
        endTime: statusValue === 0 ? null : endTime || null,
      });

      logger.info(`Illustration with ID ${id} updated successfully`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration updated successfully.",
        illustration,
      });
    } else {
      illustration = await Illustration.create({
        screenName,
        img: imageUrl,
        status: statusValue,
        startTime: statusValue === 2 ? startTime : null,
        endTime: statusValue === 0 ? null : endTime || null,
      });

      logger.info(`New illustration created with ID ${illustration.id}`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration created successfully.",
        illustration,
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
    res.status(200).json(illustration);
  } catch (error) {
    logger.error(`Error fetching illustration by ID: ${id} - ${error.message}`);
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
    const currentTime = new Date(); // Current time for comparison

    // Update statuses based on startTime and endTime
    for (let illustration of illustrations) {
      const startTime = illustration.startTime ? new Date(illustration.startTime) : null;
      const endTime = illustration.endTime ? new Date(illustration.endTime) : null;

      // Check if Scheduled illustration should become Published
      if (illustration.status === 2 && startTime && currentTime >= startTime) {
        illustration.status = 1; // Set to Published
        illustration.startTime = null; // Clear startTime
        await illustration.save();
        logger.info(`Illustration ID ${illustration.id} auto-updated from Scheduled to Published`);
      }

      // Check if Published illustration should become Unpublished (only if endTime exists)
      if (illustration.status === 1 && endTime && currentTime >= endTime) {
        illustration.status = 0; // Set to Unpublished
        illustration.endTime = null; // Clear endTime
        await illustration.save();
        logger.info(`Illustration ID ${illustration.id} auto-updated from Published to Unpublished`);
      }
    }

    logger.info("Successfully fetched all illustrations");
    res.status(200).json(illustrations);
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
        ResponseMsg:
          "Illustration is already soft-deleted. Use forceDelete=true to permanently delete it.",
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
        ResponseMsg: "Illustration not found!",
      });
    }

    // Prevent toggling if the current status is Scheduled
    if (illustration.status === 2) {
      logger.error(`Cannot toggle status of a Scheduled illustration (ID: ${id})`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Cannot toggle status of a Scheduled illustration.",
      });
    }

    const statusValue = parseInt(value, 10);
    illustration.status = statusValue;
    if (statusValue !== 1) {
      illustration.endTime = null; // Clear endTime if not Published
    }
    await illustration.save();
    logger.info(`Illustration status updated for ID ${id} to ${value}`);
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Illustration status updated successfully.",
      updatedStatus: illustration.status,
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