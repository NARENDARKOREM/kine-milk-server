const Ads = require("../Models/Ads");
const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const cron = require("node-cron");
const { Sequelize } = require("sequelize");
const { response } = require("express");
const { sanitizeFilename } = require("../utils/multerConfig");
// Verify Ads model is defined
if (!Ads || typeof Ads.create !== "function") {
  logger.error("Ads model is not properly defined or exported");
  throw new Error("Ads model is not properly defined or exported");
}


// Log server timezone for debugging
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Schedule ads activation and status update
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);

    // Activate ads with startDateTime
    const adsToActivate = await Ads.findAll({
      where: {
        status: 0,
        startDateTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const ad of adsToActivate) {
      await ad.update({ 
        status: 1,
        // Do not clear startDateTime
      });
      logger.info(`Ad ID ${ad.id} published at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    // Unpublish ads that have reached endDateTime
    const adsToUnpublish = await Ads.findAll({
      where: {
        status: 1,
        endDateTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const ad of adsToUnpublish) {
      await ad.update({
        status: 0,
        // Do not clear endDateTime
      });
      logger.info(`Ad ID ${ad.id} unpublished at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
  } catch (error) {
    logger.error(`Error in ad scheduling job: ${error.message}`);
  }
});


; // Adjust path to your logge
const upsertAds = asyncHandler(async (req, res, next) => {
  try {
    const { id, screenName, planType, status, startDateTime, endDateTime, couponPercentage } = req.body;
    let imageUrl = null;

    // Log incoming request data for debugging
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    // Handle file upload
    if (req.file) {
      // Create a sanitized filename
      req.file.originalname = sanitizeFilename(req.file.originalname);
      console.log("Sanitized filename:", req.file.originalname);
      imageUrl = await uploadToS3(req.file, "image");
      if (!imageUrl) {
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Image upload failed.",
        });
      }
      console.log("Uploaded image URL:", imageUrl);
    } else if (id) {
      // For updates, use existing image if no new file is provided
      const existingAd = await Ads.findByPk(id);
      if (!existingAd) {
        logger.error(`Ad with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Ad not found.",
        });
      }
      imageUrl = existingAd.img; // Preserve existing image
    } else {
      logger.error("Image is required for a new ad");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Image is required for a new ad.",
      });
    }

    // Validate status and planType
    const validStatuses = ["0", "1"];
    const validPlanTypes = ["instant", "subscribe"];
    if (!validStatuses.includes(status)) {
      logger.error("Invalid status value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 or 1 (Published).",
      });
    }
    if (!validPlanTypes.includes(planType)) {
      logger.error("Invalid plan type value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Plan type must be 'instant' or 'subscribe'.",
      });
    }

    // Parse and validate dates
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

    const startDate = parseISTDate(startDateTime);
    const endDate = parseISTDate(endDateTime);

    const nowInIST = new Date();

    logger.info(`Current time in IST: ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    if (startDate) {
      logger.info(`Parsed startDateTime (IST): ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
    if (endDate) {
      logger.info(`Parsed endDateTime (IST): ${endDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    if (endDate && endDate <= nowInIST) {
      logger.error("End date/time must be in the future");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End date/time must be in the future.",
      });
    }
    if (startDate && endDate && startDate >= endDate) {
      logger.error("End date/time must be after start date/time");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End date/time must be after start date/time.",
      });
    }

    const adjustedStartDateTime = startDate ? convertISTToUTC(startDate) : null;
    const adjustedEndDateTime = endDate ? convertISTToUTC(endDate) : null;

    // Adjust status based on startDateTime
    let effectiveStatus = status;
    if (startDate && startDate > nowInIST) {
      effectiveStatus = "0"; // Force unpublished if start date is in the future
    } else if (startDate && startDate <= nowInIST) {
      effectiveStatus = "1"; // Auto-publish if start date has passed
    }

    let ad;
    if (id) {
      ad = await Ads.findByPk(id);
      if (!ad) {
        logger.error(`Ad with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Ad not found.",
        });
      }

      await ad.update({
        screenName,
        planType,
        img: imageUrl,
        status: effectiveStatus,
        startDateTime: adjustedStartDateTime,
        endDateTime: adjustedEndDateTime,
        couponPercentage: couponPercentage || null,
      });

      logger.info(`Ad with ID ${id} updated successfully`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Ad updated successfully.",
        ad,
      });
    } else {
      ad = await Ads.create({
        screenName,
        planType,
        img: imageUrl,
        status: effectiveStatus,
        startDateTime: adjustedStartDateTime,
        endDateTime: adjustedEndDateTime,
        couponPercentage: couponPercentage || null,
      });

      logger.info(`New ad created with ID ${ad.id}`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Ad created successfully.",
        ad,
      });
    }
  } catch (error) {
    logger.error(`Error processing ad: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const fetchAdsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const ad = await Ads.findByPk(id);
    if (!ad) {
      logger.error(`Ad with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Ad not found",
      });
    }
    logger.info(`Ad fetched by ID ${id}`);
    res.status(200).json(ad);
  } catch (error) {
    logger.error(`Error fetching ad by ID: ${id} - ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error at fetch ad",
    });
  }
});

const fetchAds = asyncHandler(async (req, res) => {
  try {
    const ads = await Ads.findAll();
    logger.info("Successfully fetched all ads");
    res.status(200).json(ads);
  } catch (error) {
    logger.error(`Error fetching ads: ${error.message}`);
    res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Failed to fetch ads",
    });
  }
});

const deleteAdsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { forceDelete } = req.body;

  try {
    const ad = await Ads.findOne({ where: { id }, paranoid: false });

    if (!ad) {
      logger.error(`Ad with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Ad not found",
      });
    }

    if (ad.deletedAt && forceDelete !== "true") {
      logger.error(`Ad ID ${id} is already soft-deleted`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Ad is already soft-deleted. Use forceDelete=true to permanently delete it.",
      });
    }

    if (forceDelete === "true") {
      await Ads.destroy({ where: { id }, force: true });
      logger.info(`Ad with ID ${id} permanently deleted`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Ad permanently deleted successfully",
      });
    }

    await Ads.destroy({ where: { id } });
    logger.info(`Ad ID ${id} soft-deleted`);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Ad soft deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting ad with ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const toggleAdsStatus = asyncHandler(async (req, res) => {
  const { id, value } = req.body;
  try {
    const ad = await Ads.findByPk(id);
    if (!ad) {
      logger.error(`Ad with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Ad not found!",
      });
    }

    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);
    const startDate = ad.startDateTime ? new Date(ad.startDateTime) : null;
    const endDate = ad.endDateTime ? new Date(ad.endDateTime) : null;

    // Prevent toggling to Published if startDate is in the future or endDate has passed
    if (value === 1) {
      if (startDate && startDate > nowInUTC) {
        logger.error(`Cannot toggle status to Published for ad ID ${id} with future start date`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for an ad with a future start date. It will be published automatically when the start time is reached.",
        });
      }
      if (endDate && endDate <= nowInUTC) {
        logger.error(`Cannot toggle status to Published for ad ID ${id} with expired end date`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for an ad with an expired end date. Please edit the ad to update the end date.",
        });
      }
    }

    const validStatuses = [0, 1];
    if (!validStatuses.includes(value)) {
      logger.error(`Invalid status value: ${value}`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published).",
      });
    }

    ad.status = value;
    // Do not clear endDateTime when manually unpublishing
    await ad.save();
    logger.info(`Ad status updated for ID ${id} to ${value}`);
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Ad status updated successfully.",
      updatedStatus: ad.status,
    });
  } catch (error) {
    logger.error(`Error updating ad status for ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error.",
    });
  }
});

module.exports = {
  upsertAds,
  fetchAdsById,
  fetchAds,
  deleteAdsById,
  toggleAdsStatus,
};