const Coupon = require("../Models/Coupon");
const { Op } = require("sequelize");
const asyncHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const { DeliverySearchSchema, CouponDeleteSchema, getCouponByIdSchema } = require("../utils/validation");
const uploadToS3 = require("../config/fileUpload.aws");
const cron = require("node-cron");
const { Sequelize } = require("sequelize");
const { formatDate } = require("../helper/UTCIST");

// Verify Coupon model
if (!Coupon || typeof Coupon.create !== "function") {
  logger.error("Coupon model is not properly defined or exported");
  throw new Error("Coupon model is not properly defined or exported");
}

// Log server timezone
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Helper function to parse date as IST
const parseISTDate = (dateString, fieldName) => {
  if (dateString === undefined || dateString === "" || dateString === null) {
    logger.info(`No ${fieldName} provided; setting to null`);
    return null;
  }

  // Parse the date string as a local date (assuming it's in IST format from the browser)
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName} format: ${dateString}`);
  }

  // Convert to IST string explicitly to ensure consistency
  const istDateString = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istDateString);
  return istDate;
};

// Schedule coupon activation and status update (compare in IST directly)
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    // Ensure nowInIST is in Asia/Kolkata timezone
    const nowInISTString = nowInIST.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const nowInISTAdjusted = new Date(nowInISTString);

    // Activate coupons with start_date
    const couponsToActivate = await Coupon.findAll({
      where: {
        status: 0,
        start_date: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInISTAdjusted },
          ],
        },
      },
    });

    for (const coupon of couponsToActivate) {
      await coupon.update({
        status: 1,
      });
      logger.info(
        `Coupon ID ${coupon.id} published at ${nowInISTAdjusted.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `start_date preserved: ${coupon.start_date ? coupon.start_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }

    // Unpublish coupons that have reached end_date
    const couponsToUnpublish = await Coupon.findAll({
      where: {
        status: 1,
        end_date: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInISTAdjusted },
          ],
        },
      },
    });

    for (const coupon of couponsToUnpublish) {
      await coupon.update({
        status: 0,
      });
      logger.info(
        `Coupon ID ${coupon.id} unpublished at ${nowInISTAdjusted.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `end_date preserved: ${coupon.end_date ? coupon.end_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }
  } catch (error) {
    logger.error(`Error in coupon scheduling job: ${error.message}`);
  }
});

const upsertCoupon = asyncHandler(async (req, res) => {
  let {
    id,
    coupon_title,
    status,
    coupon_code,
    subtitle,
    start_date,
    end_date,
    min_amt,
    coupon_val,
    description,
  } = req.body;

  try {
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

    let imageUrl;
    if (req.file) {
      imageUrl = await uploadToS3(req.file, "image");
      imageUrl = JSON.stringify(imageUrl);
    } else if (!id) {
      logger.error("Image is required for a new coupon");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Image is required for a new coupon.",
      });
    }

    const startDate = parseISTDate(start_date, "start_date");
    const endDate = parseISTDate(end_date, "end_date");

    const nowInIST = new Date();
    const nowInISTString = nowInIST.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const nowInISTAdjusted = new Date(nowInISTString);

    logger.info(`Current time in IST: ${nowInISTAdjusted.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    if (startDate) {
      logger.info(`Parsed start_date (IST): ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
    if (endDate) {
      logger.info(`Parsed end_date (IST): ${endDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    if (endDate && endDate <= nowInISTAdjusted) {
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

    let effectiveStatus = statusValue;
    if (startDate && startDate > nowInISTAdjusted) {
      effectiveStatus = 0;
      logger.info(`Setting status to 0 (Unpublished) for coupon ${id ? id : "new"} due to future start_date`);
    } else if (startDate && startDate <= nowInISTAdjusted) {
      effectiveStatus = 1;
      logger.info(`Setting status to 1 (Published) for coupon ${id ? id : "new"} as start_date is now or in the past`);
    }

    let coupon;
    if (id) {
      coupon = await Coupon.findByPk(id);
      if (!coupon) {
        logger.error(`Coupon with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Coupon not found.",
        });
      }

      
      await coupon.update({
        coupon_title,
        coupon_img: imageUrl || coupon.coupon_img,
        status: effectiveStatus,
        coupon_code,
        subtitle,
        start_date: startDate,
        end_date: endDate,
        min_amt,
        coupon_val,
        description,
      });

      logger.info(
        `Coupon ${id} updated successfully. ` +
        `Status: ${effectiveStatus}, ` +
        `start_date: ${coupon.start_date ? coupon.start_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `end_date: ${coupon.end_date ? coupon.end_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Coupon updated successfully.",
        coupon: {
          ...coupon.toJSON(),
          start_date: coupon.start_date,
          end_date: coupon.end_date,
        },
      });
    } else {
      coupon = await Coupon.create({
        coupon_img: imageUrl,
        coupon_title,
        status: effectiveStatus,
        coupon_code,
        subtitle,
        start_date: startDate,
        end_date: endDate,
        min_amt,
        coupon_val,
        description,
      });

      logger.info(
        `New coupon created with ID ${coupon.id}. ` +
        `Status: ${effectiveStatus}, ` +
        `start_date: ${coupon.start_date ? coupon.start_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `end_date: ${coupon.end_date ? coupon.end_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(201).json({
        ResponseCode: "201",
        Result: "true",
        ResponseMsg: "Coupon created successfully.",
        coupon: {
          ...coupon.toJSON(),
          start_date: coupon.start_date,
          end_date: coupon.end_date,
        },
      });
    }
  } catch (error) {
    logger.error(`Error processing coupon: ${error.message}`);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const getAllCoupon = asyncHandler(async (req, res) => {
  try {
    const coupons = await Coupon.findAll();
    logger.info("Successfully retrieved all coupons");
    
    const couponsFormated = coupons.map((coupon)=>({
      ...coupon.toJSON(),
      start_date: formatDate(coupon.start_date),
      end_date: formatDate(coupon.end_date),
    }))
    res.status(200).json(couponsFormated);
  } catch (error) {
    logger.error(`Error retrieving coupons: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve coupons", error });
  }
});

const getCouponCount = asyncHandler(async (req, res) => {
  try {
    const nowInIST = new Date();
    const nowInISTString = nowInIST.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const currentTime = new Date(nowInISTString);

    const couponCount = await Coupon.count({
      where: {
        status: 1,
        [Op.or]: [
          { end_date: { [Op.gte]: currentTime } },
          { end_date: null },
        ],
      },
    });

    const couponAll = await Coupon.findAll({
      where: {
        status: 1,
        [Op.or]: [
          { end_date: { [Op.gte]: currentTime } },
          { end_date: null },
        ],
      },
    });

    logger.info(`Coupon count: ${couponCount}`);
    // Dates are already in IST, no conversion needed
    res.status(200).json({ CouponAll: couponAll, CouponCount: couponCount });
  } catch (error) {
    logger.error(`Error retrieving coupon count: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve coupon count", error });
  }
});

const getCouponById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      logger.error(`Coupon with ID ${id} not found`);
      return res.status(404).json({ error: "Coupon not found" });
    }
    logger.info(`Coupon with ID ${id} found`);
    const couponWithFormatedDates ={
      ...coupon.toJSON(),
      start_date: formatDate(coupon.start_date),
      end_date: formatDate(coupon.end_date),
    }
    res.status(200).json(couponWithFormatedDates);
  } catch (error) {
    logger.error(`Error retrieving coupon by ID ${id}: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { forceDelete } = req.body;

  try {
    const coupon = await Coupon.findOne({ where: { id }, paranoid: false });

    if (!coupon) {
      logger.error(`Coupon with ID ${id} not found`);
      return res.status(404).json({ error: "Coupon not found" });
    }

    if (coupon.deletedAt && forceDelete !== "true") {
      logger.error(`Coupon with ID ${id} is already soft-deleted`);
      return res.status(400).json({
        error: "Coupon is already soft-deleted. Use forceDelete=true to permanently delete it.",
      });
    }

    if (forceDelete === "true") {
      await Coupon.destroy({ where: { id }, force: true });
      logger.info(`Coupon with ID ${id} permanently deleted`);
      return res.status(200).json({ message: "Coupon permanently deleted successfully" });
    }

    await Coupon.destroy({ where: { id } });
    logger.info(`Coupon with ID ${id} soft-deleted`);
    return res.status(200).json({ message: "Coupon soft deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting coupon with ID ${id}: ${error.message}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const toggleCouponStatus = asyncHandler(async (req, res) => {
  const { id, value, start_date, end_date } = req.body;

  try {
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      logger.error(`Coupon with ID ${id} not found`);
      return res.status(404).json({ message: "Coupon not found." });
    }

    const nowInIST = new Date();
    const nowInISTString = nowInIST.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const nowInISTAdjusted = new Date(nowInISTString);

    // Dates are stored in IST, no conversion needed
    const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
    const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

    // Log the dates for debugging
    logger.info(`Current time in IST: ${nowInISTAdjusted.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    logger.info(`Coupon ID ${id} start_date (raw): ${coupon.start_date}`);
    logger.info(`Coupon ID ${id} start_date (parsed as IST): ${startDate ? startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`);
    logger.info(`Coupon ID ${id} end_date (raw): ${coupon.end_date}`);
    logger.info(`Coupon ID ${id} end_date (parsed as IST): ${endDate ? endDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`);

    if (start_date !== undefined) {
      logger.warn(`start_date (${start_date}) included in toggleCouponStatus for coupon ${id}; ignoring to preserve existing value`);
    }
    if (end_date !== undefined) {
      logger.warn(`end_date (${end_date}) included in toggleCouponStatus for coupon ${id}; ignoring to preserve existing value`);
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

    // Allow toggling to unpublished (status = 0) at any time
    if (statusValue === 0) {
      coupon.status = statusValue;
    } else if (statusValue === 1) {
      // Allow toggling to published (status = 1) only if:
      // 1. There is no start_date OR the current time is on or after start_date (startDate <= nowInISTAdjusted)
      // AND
      // 2. There is no end_date OR the current time is on or before end_date (nowInISTAdjusted <= endDate)
      const isStartDateValid =  startDate <= nowInISTAdjusted;
      const isEndDateValid =  nowInISTAdjusted <= endDate;

      logger.info(`isStartDateValid: ${isStartDateValid}, isEndDateValid: ${isEndDateValid}`);

      if (!isStartDateValid) {
        logger.error(`Cannot toggle status to Published for coupon ID ${id} with future start_date`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status before start date.",
        });
      }

      if (!isEndDateValid) {
        logger.error(`Cannot toggle status to Published for coupon ID ${id} with expired end_date`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status after end date has expired.",
        });
      }

      coupon.status = statusValue;
    }

    // Preserve start_date and end_date
    await coupon.save();

    logger.info(
      `Coupon status updated for ID ${coupon.id} to ${statusValue}. ` +
      `start_date preserved: ${coupon.start_date ? coupon.start_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
      `end_date preserved: ${coupon.end_date ? coupon.end_date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
    );
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Coupon status updated successfully.",
      updatedStatus: coupon.status,
      start_date: coupon.start_date,
      end_date: coupon.end_date,
    });
  } catch (error) {
    logger.error(`Error updating coupon status for ID ${id}: ${error.message}`);
    res.status(500).json({ message: "Internal server error." });
  }
});

const searchCoupon = asyncHandler(async (req, res) => {
  const { error } = DeliverySearchSchema.validate(req.body);
  if (error) {
    logger.error(error.details[0].message);
    return res.status(400).json({ error: error.details[0].message });
  }

  const { id, title } = req.body;
  const whereClause = {};

  if (id) {
    whereClause.id = id;
  }
  if (title && title.trim() !== "") {
    whereClause.coupon_title = { [Op.like]: `%${title.trim()}%` };
  }

  const coupons = await Coupon.findAll({ where: whereClause });

  logger.info("Coupons found");
  // Dates are already in IST, no conversion needed
  res.status(200).json(coupons);
});

module.exports = {
  upsertCoupon,
  getAllCoupon,
  getCouponCount,
  getCouponById,
  deleteCoupon,
  toggleCouponStatus,
  searchCoupon,
};