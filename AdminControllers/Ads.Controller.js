const Ads = require("../Models/Ads");
const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const cron = require("node-cron");
const { Sequelize } = require("sequelize");
const { sanitizeFilename } = require("../utils/multerConfig");

// Verify Ads model is defined
if (!Ads || typeof Ads.create !== "function") {
  logger.error("Ads model is not properly defined or exported");
  throw new Error("Ads model is not properly defined or exported");
}

// Log server timezone for debugging
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Helper function to format UTC to IST for frontend
const formatUTCToIST = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istDate = new Date(new Date(date).getTime() + istOffset);
  return istDate.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm
};

// Schedule ads activation and status update
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date(); // Current time in UTC

    // Activate ads with startDateTime
    const adsToActivate = await Ads.findAll({
      where: {
        status: 0,
        startDateTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: now },
          ],
        },
      },
    });

    for (const ad of adsToActivate) {
      await ad.update({ 
        status: 1,
      });
      logger.info(`Ad ID ${ad.id} published at ${formatUTCToIST(now)}`);
    }

    // Unpublish ads that have reached endDateTime
    const adsToUnpublish = await Ads.findAll({
      where: {
        status: 1,
        endDateTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: now },
          ],
        },
      },
    });

    for (const ad of adsToUnpublish) {
      await ad.update({
        status: 0,
      });
      logger.info(`Ad ID ${ad.id} unpublished at ${formatUTCToIST(now)}`);
    }
  } catch (error) {
    logger.error(`Error in ad scheduling job: ${error.message}`);
  }
});

const upsertAds = asyncHandler(async (req, res, next) => {
  try {
    const { id, screenName, planType, status, startDateTime, endDateTime, couponPercentage } = req.body;
    let imageUrl = null;

    // Log incoming request data for debugging
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    // Handle file upload
    if (req.file) {
      req.file.originalname = sanitizeFilename(req.file.originalname);
      console.log("Sanitized filename:", req.file.originalname);
      imageUrl = await uploadToS3(req.file, "image");
      if (!imageUrl) {
        return res.status(500).json({
          ResponseCode: "500",
          Result: "false",
          ResponseMsg: "Image upload failed.",
        });
      }
      console.log("Uploaded image URL:", imageUrl);
    } else if (id) {
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
        ResponseMsg: "Status must be 0 or 1.",
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
    const parseDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      return date; // Store in UTC
    };

    const startDate = parseDate(startDateTime);
    const endDate = parseDate(endDateTime);

    const now = new Date(); // Current time in UTC

    if (endDate && endDate <= now) {
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

    // Adjust status based on startDateTime
    let effectiveStatus = status;
    if (startDate && startDate > now) {
      effectiveStatus = "0"; // Force unpublished if start date is in the future
    } else if (startDate && startDate <= now) {
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
        startDateTime: startDate,
        endDateTime: endDate,
        couponPercentage: couponPercentage || null,
      });

      logger.info(`Ad with ID ${id} updated successfully`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Ad updated successfully.",
        ad: {
          ...ad.toJSON(),
          startDateTime: formatUTCToIST(ad.startDateTime),
          endDateTime: formatUTCToIST(ad.endDateTime),
        },
      });
    } else {
      ad = await Ads.create({
        screenName,
        planType,
        img: imageUrl,
        status: effectiveStatus,
        startDateTime: startDate,
        endDateTime: endDate,
        couponPercentage: couponPercentage || null,
      });

      logger.info(`New ad created with ID ${ad.id}`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Ad created successfully.",
        ad: {
          ...ad.toJSON(),
          startDateTime: formatUTCToIST(ad.startDateTime),
          endDateTime: formatUTCToIST(ad.endDateTime),
        },
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
    res.status(200).json({
      ...ad.toJSON(),
      startDateTime: formatUTCToIST(ad.startDateTime),
      endDateTime: formatUTCToIST(ad.endDateTime),
    });
  } catch (error) {
    logger.error(`Error fetching ad by ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error at fetch ad by id",
    });
  }
});

const fetchAds = asyncHandler(async (req, res) => {
  try {
    const ads = await Ads.findAll();
    logger.info("Successfully fetched ads");
    const adsWithIST = ads.map((ad) => ({
      ...ad.toJSON(),
      startDateTime: formatUTCToIST(ad.startDateTime),
      endDateTime: formatUTCToIST(ad.endDateTime),
    }));
    res.status(200).json(adsWithIST);
  } catch (error) {
    logger.error(`Error fetching all ads: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error fetching all ads",
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
      logger.error(`Ad with ID ${id} is already soft-deleted`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Ad is already soft-deleted. Use forceDelete=true to permanently delete it",
      });
    }

    if (forceDelete === "true") {
      await Ads.destroy({ where: { id }, force: true });
      logger.info(`Ad with ID ${id} permanently deleted`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Ad deleted successfully",
      });
    }

    await ad.destroy({ where: { id } });
    logger.info(`Ad with ID ${id} soft-deleted`);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Ad soft-deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting ad with ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error deleting ad by id",
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
        ResponseMsg: "Ad not found",
      });
    }

    const now = new Date(); // Current time in UTC
    const startDateTime = ad.startDateTime ? new Date(ad.startDateTime) : null;
    const endDateTime = ad.endDateTime ? new Date(ad.endDateTime) : null;

    // Prevent toggling to Published if startDateTime is future or endDateTime has passed
    if (value === 1) {
      if (startDateTime && startDateTime > now) {
        logger.error(`Cannot toggle status to Published for ad ID ${id} with future startDateTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle to Published for an ad with a future start date",
        });
      }
      if (endDateTime && endDateTime <= now) {
        logger.error(`Cannot toggle status to Published for ad ID ${id} with expired endDateTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle to Published for an ad with an expired end date",
        });
      }
    }

    const validStatuses = [0, 1];
    if (!validStatuses.includes(Number(value))) {
      logger.error(`Invalid status value: ${value}`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published)",
      });
    }

    ad.status = value;
    await ad.save();
    logger.info(`Ad status updated for ID ${id} to ${value}`);
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Status updated successfully",
      adStatus: ad.status,
      startDateTime: formatUTCToIST(ad.startDateTime),
      endDateTime: formatUTCToIST(ad.endDateTime),
    });
  } catch (error) {
    logger.error(`Error updating ad status for ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error updating ad status",
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