const Banner = require("../Models/Banner");
const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const cron = require("node-cron");
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

// Schedule banner activation and status update
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);

    // Activate scheduled banners
    const bannersToActivate = await Banner.findAll({
      where: {
        status: 2,
        startTime: { [Sequelize.Op.lte]: nowInUTC },
        endTime: { [Sequelize.Op.gt]: nowInUTC },
      },
    });

    for (const banner of bannersToActivate) {
      await banner.update({
        status: 1,
        startTime: null, // Clear startTime
      });
      logger.info(`Banner ID ${banner.id} published and startTime cleared at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
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
        startTime: null, // Clear startTime
        endTime: null, // Clear endTime
      });
      logger.info(`Banner ID ${banner.id} unpublished and startTime, endTime cleared at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    // Clear times for unpublished banners with expired endTime
    const expiredBanners = await Banner.findAll({
      where: {
        status: 0,
        endTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const banner of expiredBanners) {
      await banner.update({
        startTime: null,
        endTime: null,
      });
      logger.info(`Banner ID ${banner.id} unpublished banner cleared startTime and endTime at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
  } catch (error) {
    logger.error(`Error in banner scheduling job: ${error.message}`);
  }
});

const upsertBanner = asyncHandler(async (req, res, next) => {
  try {
    const { id, status, planType, startTime, endTime } = req.body;
    let imageUrl;

    if (req.file) {
      imageUrl = await uploadToS3(req.file, "image");
    } else if (!id) {
      logger.error("Image is required for a new banner");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        Response: "Image is required for a new banner.",
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
    const validStatuses = [0, 1, 2];
    if (!validStatuses.includes(statusValue)) {
      logger.error("Invalid status value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished), 1 (Published), or 2 (Scheduled).",
      });
    }

    const parseISTDate = (dateString) => {
      if (!dateString) return null;
      const istDate = new Date(dateString);
      if (isNaN(istDate.getTime())) {
        throw new Error("Invalid date format");
      }
      return istDate;
    };

    const convertISTToUTC = (date) => {
      if (!date) return null;
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(date.getTime() - istOffset);
    };

    const startDate = statusValue === 2 ? parseISTDate(startTime) : null;
    const endDate = (statusValue === 1 || statusValue === 2) && endTime ? parseISTDate(endTime) : null;

    const nowInIST = new Date();

    logger.info(`Current time in IST: ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    if (startDate) {
      logger.info(`Parsed startTime (IST): ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
    if (endDate) {
      logger.info(`Parsed endTime (IST): ${endDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    if (statusValue === 2 && !startTime) {
      logger.error("startTime is required for Scheduled status");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "startTime is required when status is Scheduled.",
      });
    }
    if (statusValue === 2 && !endTime) {
      logger.error("endTime is required for Scheduled status");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "endTime is required when status is Scheduled.",
      });
    }

    if (statusValue === 2) {
      if (startDate <= nowInIST) {
        logger.error("startTime must be in the future for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "startTime must be in the future for Scheduled status.",
        });
      }
      if (endDate <= startDate) {
        logger.error("endTime must be greater than startTime for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "endTime must be greater than startTime for Scheduled status.",
        });
      }
    }

    if (statusValue === 1 && endDate) {
      if (endDate <= nowInIST) {
        logger.error("endTime must be in the future for Published status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "endTime must be in the future if provided for Published status.",
        });
      }
    }

    const adjustedStartTime = startDate ? convertISTToUTC(startDate) : null;
    const adjustedEndTime = endDate ? convertISTToUTC(endDate) : null;

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
        img: imageUrl || banner.img,
        planType,
        status: statusValue,
        startTime: statusValue === 2 ? adjustedStartTime : null,
        endTime: statusValue === 0 ? null : adjustedEndTime || null,
      });

      logger.info(`Banner with ID ${id} updated successfully`);
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
        img: imageUrl,
        planType,
        status: statusValue,
        startTime: adjustedStartTime,
        endTime: statusValue === 0 ? null : adjustedEndTime || null,
      });

      logger.info(`New banner created with ID ${banner.id}`);
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
    logger.error(`Error fetching banner by ID: ${id} - ${error.message}`);
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
        ResponseMsg:
          "Banner is already soft-deleted. Use forceDelete=true to permanently delete it.",
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
      Result: "false",
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
  const { id, value } = req.body;
  try {
    const banner = await Banner.findByPk(id);
    if (!banner) {
      logger.error(`Banner with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Banner not found!",
      });
    }

    if (banner.status === 2) {
      logger.error(`Cannot toggle status of a Scheduled banner (ID: ${id})`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Cannot toggle status of a Scheduled banner.",
      });
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
    if (statusValue === 0) {
      banner.startTime = null; // Clear startTime
      banner.endTime = null; // Clear endTime
    }
    await banner.save();
    logger.info(`Banner status updated for ID ${id} to ${value}`);
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Banner status updated successfully.",
      updatedStatus: banner.status,
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