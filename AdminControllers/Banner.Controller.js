const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const Banner = require("../Models/Banner");
const { Sequelize } = require("sequelize");

// Verify Banner model is defined
if (!Banner || typeof Banner.create !== "function") {
  logger.error("Banner model is not properly defined or exported");
  throw new Error("Banner model is not properly defined or exported");
}

// Log server timezone for debugging
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Helper function to convert UTC to IST
const convertUTCToIST = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(new Date(date).getTime() + istOffset);
};

// Helper function to convert IST to UTC
const convertISTToUTC = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(new Date(date).getTime() - istOffset);
};

// Schedule banner activation and status update
const cron = require("node-cron");
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);

    // Activate banners with startTime
    const bannersToActivate = await Banner.findAll({
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

    for (const banner of bannersToActivate) {
      await banner.update({
        status: 1,
        // Explicitly do not clear startTime to preserve it
      });
      logger.info(
        `Banner ID ${banner.id} published at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `startTime preserved: ${banner.startTime ? convertUTCToIST(banner.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }

    // Unpublish banners that have reached endTime
    const bannersToUnpublish = await Banner.findAll({
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

    for (const banner of bannersToUnpublish) {
      await banner.update({
        status: 0,
        // Explicitly do not clear endTime to preserve it
      });
      logger.info(
        `Banner ID ${banner.id} unpublished at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `endTime preserved: ${banner.endTime ? convertUTCToIST(banner.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }
  } catch (error) {
    logger.error(`Error in banner scheduling job: ${error.message}`);
  }
});

const upsertBanner = asyncHandler(async (req, res, next) => {
  try {
    const { id, planType, status, startTime, endTime } = req.body;
    let imageUrl;

    // Check if file is provided
    if (req.file) {
      imageUrl = await uploadToS3(req.file, "image");
    } else if (!id) {
      logger.error("Image is required for a new banner");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Image is required for a new banner.",
      });
    }

    const validPlanTypes = ["instant", "subscribe"];
    if (!validPlanTypes.includes(planType)) {
      logger.error("Invalid plan type value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Plan type must be 'instant' or 'subscribe'.",
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
        logger.warn(`Empty or undefined ${fieldName} received for ${id ? `banner ${id}` : "new banner"}; preserving existing value`);
        return undefined; // Signal to preserve existing value
      }
      const istDate = new Date(dateString);
      if (isNaN(istDate.getTime())) {
        throw new Error(`Invalid ${fieldName} format`);
      }
      return istDate;
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

    let banner;
    if (id) {
      banner = await Banner.findByPk(id);
      if (!banner) {
        logger.error(`Banner with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Banner not found.",
        });
      }

      await banner.update({
        planType,
        img: imageUrl || banner.img,
        status: effectiveStatus,
        startTime: startDate !== undefined ? adjustedStartTime : banner.startTime,
        endTime: endDate !== undefined ? adjustedEndTime : banner.endTime,
      });

      logger.info(
        `Banner ${id} updated successfully. ` +
        `Status: ${effectiveStatus}, ` +
        `startTime: ${banner.startTime ? convertUTCToIST(banner.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `endTime: ${banner.endTime ? convertUTCToIST(banner.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Banner updated successfully.",
        banner: {
          ...banner.toJSON(),
          startTime: convertUTCToIST(banner.startTime),
          endTime: convertUTCToIST(banner.endTime),
        },
      });
    } else {
      banner = await Banner.create({
        planType,
        img: imageUrl,
        status: effectiveStatus,
        startTime: adjustedStartTime,
        endTime: adjustedEndTime,
      });

      logger.info(
        `New banner created with ID ${banner.id}. ` +
        `Status: ${effectiveStatus}, ` +
        `startTime: ${banner.startTime ? convertUTCToIST(banner.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `endTime: ${banner.endTime ? convertUTCToIST(banner.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Banner created successfully.",
        banner: {
          ...banner.toJSON(),
          startTime: convertUTCToIST(banner.startTime),
          endTime: convertUTCToIST(banner.endTime),
        },
      });
    }
  } catch (error) {
    logger.error(`Error processing banner: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const fetchBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const banner = await Banner.findByPk(id);
    if (!banner) {
      logger.error(`Banner with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Banner not found",
      });
    }
    logger.info(`Banner fetched by ID ${id}`);
    res.status(200).json({
      ...banner.toJSON(),
      startTime: convertUTCToIST(banner.startTime),
      endTime: convertUTCToIST(banner.endTime),
    });
  } catch (error) {
    logger.error(`Error fetching banner by ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error at fetch banner",
    });
  }
});

const fetchBanners = asyncHandler(async (req, res) => {
  try {
    const banners = await Banner.findAll();
    logger.info("Successfully fetched all banners");
    const bannersWithIST = banners.map(banner => ({
      ...banner.toJSON(),
      startTime: convertUTCToIST(banner.startTime),
      endTime: convertUTCToIST(banner.endTime),
    }));
    res.status(200).json(bannersWithIST);
  } catch (error) {
    logger.error(`Error fetching banners: ${error.message}`);
    res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Failed to fetch banners",
    });
  }
});

const deleteBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { forceDelete } = req.body;

  try {
    const banner = await Banner.findOne({ where: { id }, paranoid: false });

    if (!banner) {
      logger.error(`Banner with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Banner not found",
      });
    }

    if (banner.deletedAt && forceDelete !== "true") {
      logger.error(`Banner ID ${id} is already soft-deleted`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Banner is already soft-deleted. Use forceDelete=true to permanently delete it.",
      });
    }

    if (forceDelete === "true") {
      await Banner.destroy({ where: { id }, force: true });
      logger.info(`Banner with ID ${id} permanently deleted`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Banner permanently deleted successfully",
      });
    }

    await Banner.destroy({ where: { id } });
    logger.info(`Banner ID ${id} soft-deleted`);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Banner soft deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting banner with ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const toggleBannerStatus = asyncHandler(async (req, res) => {
  const { id, value, startTime, endTime } = req.body;
  try {
    const banner = await Banner.findByPk(id);
    if (!banner) {
      logger.error(`Banner with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Banner not found.",
      });
    }

    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);
    const startDate = banner.startTime ? new Date(banner.startTime) : null;
    const endDate = banner.endTime ? new Date(banner.endTime) : null;

    // Log if startTime or endTime were included in the request
    if (startTime !== undefined) {
      logger.warn(`startTime (${startTime}) included in toggleBannerStatus for banner ${id}; ignoring to preserve existing value`);
    }
    if (endTime !== undefined) {
      logger.warn(`endTime (${endTime}) included in toggleBannerStatus for banner ${id}; ignoring to preserve existing value`);
    }

    // Prevent toggling to Published if startTime is future or endTime has passed
    if (value === 1) {
      if (startDate && startDate > nowInUTC) {
        logger.error(`Cannot toggle status to Published for banner ID ${id} with future startTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for a banner with a future startTime. It will be published automatically when the startTime is reached.",
        });
      }
      if (endDate && endDate <= nowInUTC) {
        logger.error(`Cannot toggle status to Published for banner ID ${id} with expired endTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot Toggle status After Date Exprired.",
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

    banner.status = statusValue;
    // Explicitly do not clear or modify startTime or endTime
    await banner.save();
    logger.info(
      `Banner status updated for ID ${banner.id} to ${statusValue}. ` +
      `startTime preserved: ${banner.startTime ? convertUTCToIST(banner.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
      `endTime preserved: ${banner.endTime ? convertUTCToIST(banner.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
    );
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Banner status updated successfully.",
      updatedStatus: banner.status,
      startTime: convertUTCToIST(banner.startTime),
      endTime: convertUTCToIST(banner.endTime),
    });
  } catch (error) {
    logger.error(`Error updating banner status for ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error.",
    });
  }
});

module.exports = {
  upsertBanner,
  fetchBannerById,
  fetchBanners,
  deleteBannerById,
  toggleBannerStatus,
};