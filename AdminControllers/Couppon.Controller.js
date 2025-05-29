const Coupon = require("../Models/Coupon");
const { Op } = require("sequelize");
const asyncHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const { DeliverySearchSchema, CouponDeleteSchema, getCouponByIdSchema } = require("../utils/validation");
const uploadToS3 = require("../config/fileUpload.aws");
const cron = require("node-cron");
const { Sequelize } = require("sequelize");

// Verify Coupon model
if (!Coupon || typeof Coupon.create !== "function") {
  logger.error("Coupon model is not properly defined or exported");
  throw new Error("Coupon model is not properly defined or exported");
}

// Log server timezone
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Helper function to convert UTC to IST
const convertUTCToIST = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(new Date(date).getTime() + istOffset);
};

// Schedule coupon activation and status update
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);

    // Activate coupons with start_date
    const couponsToActivate = await Coupon.findAll({
      where: {
        status: 0,
        start_date: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const coupon of couponsToActivate) {
      await coupon.update({
        status: 1,
        // Preserve start_date
      });
      logger.info(
        `Coupon ID ${coupon.id} published at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `start_date preserved: ${coupon.start_date ? convertUTCToIST(coupon.start_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }

    // Unpublish coupons that have reached end_date
    const couponsToUnpublish = await Coupon.findAll({
      where: {
        status: 1,
        end_date: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const coupon of couponsToUnpublish) {
      await coupon.update({
        status: 0,
        // Preserve end_date
      });
      logger.info(
        `Coupon ID ${coupon.id} unpublished at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `end_date preserved: ${coupon.end_date ? convertUTCToIST(coupon.end_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
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

    const parseISTDate = (dateString, fieldName) => {
      if (dateString === undefined || dateString === "") {
        logger.warn(`Empty or undefined ${fieldName} received for ${id ? `coupon ${id}` : "new coupon"}; preserving existing value`);
        return undefined;
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

    const startDate = parseISTDate(start_date, "start_date");
    const endDate = parseISTDate(end_date, "end_date");

    const nowInIST = new Date();
    logger.info(`Current time in IST: ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    if (startDate) {
      logger.info(`Parsed start_date (IST): ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
    if (endDate) {
      logger.info(`Parsed end_date (IST): ${endDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
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

    const adjustedStartDate = startDate ? convertISTToUTC(startDate) : null;
    const adjustedEndDate = endDate ? convertISTToUTC(endDate) : null;

    let effectiveStatus = statusValue;
    if (startDate && startDate > nowInIST) {
      effectiveStatus = 0;
    } else if (startDate && startDate <= nowInIST) {
      effectiveStatus = 1;
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
        start_date: startDate !== undefined ? adjustedStartDate : coupon.start_date,
        end_date: endDate !== undefined ? adjustedEndDate : coupon.end_date,
        min_amt,
        coupon_val,
        description,
      });

      logger.info(
        `Coupon ${id} updated successfully. ` +
        `Status: ${effectiveStatus}, ` +
        `start_date: ${coupon.start_date ? convertUTCToIST(coupon.start_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `end_date: ${coupon.end_date ? convertUTCToIST(coupon.end_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Coupon updated successfully.",
        coupon: {
          ...coupon.toJSON(),
          start_date: convertUTCToIST(coupon.start_date),
          end_date: convertUTCToIST(coupon.end_date),
        },
      });
    } else {
      coupon = await Coupon.create({
        coupon_img: imageUrl,
        coupon_title,
        status: effectiveStatus,
        coupon_code,
        subtitle,
        start_date: adjustedStartDate,
        end_date: adjustedEndDate,
        min_amt,
        coupon_val,
        description,
      });

      logger.info(
        `New coupon created with ID ${coupon.id}. ` +
        `Status: ${effectiveStatus}, ` +
        `start_date: ${coupon.start_date ? convertUTCToIST(coupon.start_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `end_date: ${coupon.end_date ? convertUTCToIST(coupon.end_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(201).json({
        ResponseCode: "201",
        Result: "true",
        ResponseMsg: "Coupon created successfully.",
        coupon: {
          ...coupon.toJSON(),
          start_date: convertUTCToIST(coupon.start_date),
          end_date: convertUTCToIST(coupon.end_date),
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
    const couponsWithIST = coupons.map(coupon => ({
      ...coupon.toJSON(),
      start_date: convertUTCToIST(coupon.start_date),
      end_date: convertUTCToIST(coupon.end_date),
    }));
    res.status(200).json(couponsWithIST);
  } catch (error) {
    logger.error(`Error retrieving coupons: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve coupons", error });
  }
});

const getCouponCount = asyncHandler(async (req, res) => {
  try {
    const currentTime = new Date();
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

    const couponAllWithIST = couponAll.map(coupon => ({
      ...coupon.toJSON(),
      start_date: convertUTCToIST(coupon.start_date),
      end_date: convertUTCToIST(coupon.end_date),
    }));

    logger.info(`Coupon count: ${couponCount}`);
    res.status(200).json({ CouponAll: couponAllWithIST, CouponCount: couponCount });
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
    res.status(200).json({
      ...coupon.toJSON(),
      start_date: convertUTCToIST(coupon.start_date),
      end_date: convertUTCToIST(coupon.end_date),
    });
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
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);
    const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
    const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

    if (start_date !== undefined) {
      logger.warn(`start_date (${start_date}) included in toggleCouponStatus for coupon ${id}; ignoring to preserve existing value`);
    }
    if (end_date !== undefined) {
      logger.warn(`end_date (${end_date}) included in toggleCouponStatus for coupon ${id}; ignoring to preserve existing value`);
    }

    if (value === 1) {
      if (startDate && startDate > nowInUTC) {
        logger.error(`Cannot toggle status to Published for coupon ID ${id} with future start_date`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status before start date.",
        });
      }
      if (endDate && endDate <= nowInUTC) {
        logger.error(`Cannot toggle status to Published for coupon ID ${id} with expired end_date`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to after Date expired.",
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

    coupon.status = statusValue;
    // Preserve start_date and end_date
    await coupon.save();

    logger.info(
      `Coupon status updated for ID ${coupon.id} to ${statusValue}. ` +
      `start_date preserved: ${coupon.start_date ? convertUTCToIST(coupon.start_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
      `end_date preserved: ${coupon.end_date ? convertUTCToIST(coupon.end_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
    );
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Coupon status updated successfully.",
      updatedStatus: coupon.status,
      start_date: convertUTCToIST(coupon.start_date),
      end_date: convertUTCToIST(coupon.end_date),
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
  res.status(200).json(coupons.map(coupon => ({
    ...coupon.toJSON(),
    start_date: convertUTCToIST(coupon.start_date),
    end_date: convertUTCToIST(coupon.end_date),
  })));
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