const Coupon = require("../Models/Coupon");
const { Op } = require("sequelize");
const asyncHandler = require("../middlewares/errorHandler"); // Fixed typo
const logger = require("../utils/logger");
const { DeliverySearchSchema, CouponDeleteSchema, getCouponByIdSchema } = require("../utils/validation");
const uploadToS3 = require("../config/fileUpload.aws");

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
    const currentTime = new Date();

    // Validate start_date and end_date based on status
    if (statusValue === 2 && !start_date) {
      logger.error("start_date is required for Scheduled status");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "start_date is required when status is Scheduled.",
      });
    }
    if (statusValue === 2 && !end_date) {
      logger.error("end_date is required for Scheduled status");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "end_date is required when status is Scheduled.",
      });
    }

    // Scheduling conditions for Scheduled status
    if (statusValue === 2) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate <= currentTime) {
        logger.error("start_date must be in the future for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "start_date must be in the future for Scheduled status.",
        });
      }

      if (endDate <= currentTime) {
        logger.error("end_date must be in the future for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "end_date must be in the future for Scheduled status.",
        });
      }

      if (endDate <= startDate) {
        logger.error("end_date must be greater than start_date for Scheduled status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "end_date must be greater than start_date for Scheduled status.",
        });
      }
    }

    // Validate end_date for Published status if provided
    if (statusValue === 1 && end_date) {
      const endDate = new Date(end_date);
      if (endDate <= currentTime) {
        logger.error("end_date must be in the future for Published status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "end_date must be in the future for Published status.",
        });
      }
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
        status: statusValue,
        coupon_code,
        subtitle,
        start_date: statusValue === 2 ? start_date : null,
        end_date: statusValue === 0 ? null : end_date || null, // Allow null end_date for Published
        min_amt,
        coupon_val,
        description,
      });

      logger.info(`Coupon with ID ${id} updated successfully`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Coupon updated successfully.",
        coupon,
      });
    } else {
      coupon = await Coupon.create({
        coupon_img: imageUrl,
        coupon_title,
        status: statusValue,
        coupon_code,
        subtitle,
        start_date: statusValue === 2 ? start_date : null,
        end_date: statusValue === 0 ? null : end_date || null, // Allow null end_date for Published
        min_amt,
        coupon_val,
        description,
      });

      logger.info(`Coupon created with ID ${coupon.id}`);
      return res.status(201).json({
        ResponseCode: "201",
        Result: "true",
        ResponseMsg: "Coupon created successfully.",
        coupon,
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
    const currentTime = new Date();

    for (let coupon of coupons) {
      const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
      const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

      if (coupon.status === 2 && startDate && currentTime >= startDate) {
        coupon.status = 1;
        coupon.start_date = null;
        await coupon.save();
        logger.info(`Coupon ID ${coupon.id} auto-updated from Scheduled to Published`);
      }

      // Only update to Unpublished if end_date exists and has passed
      if (coupon.status === 1 && endDate && currentTime >= endDate) {
        coupon.status = 0;
        coupon.end_date = null;
        await coupon.save();
        logger.info(`Coupon ID ${coupon.id} auto-updated from Published to Unpublished`);
      }
    }

    logger.info("Successfully retrieved all coupons");
    res.status(200).json(coupons);
  } catch (error) {
    logger.error(`Error retrieving coupons: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve coupons", error });
  }
});

const getCouponCount = asyncHandler(async (req, res) => {
  try {
    const currentTime = new Date();
    const coupons = await Coupon.findAll();

    for (let coupon of coupons) {
      const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
      const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

      if (coupon.status === 2 && startDate && currentTime >= startDate) {
        coupon.status = 1;
        coupon.start_date = null;
        await coupon.save();
        logger.info(`Coupon ID ${coupon.id} auto-updated from Scheduled to Published`);
      }

      if (coupon.status === 1 && endDate && currentTime >= endDate) {
        coupon.status = 0;
        coupon.end_date = null;
        await coupon.save();
        logger.info(`Coupon ID ${coupon.id} auto-updated from Published to Unpublished`);
      }
    }

    // Count Published coupons, including those without an end_date
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
    res.status(200).json(coupon);
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
  const { id, value } = req.body;

  try {
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      logger.error(`Coupon with ID ${id} not found`);
      return res.status(404).json({ message: "Coupon not found." });
    }

    if (coupon.status === 2) {
      logger.error(`Cannot toggle status of a Scheduled coupon (ID: ${id})`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Cannot toggle status of a Scheduled coupon.",
      });
    }

    const currentTime = new Date();
    const statusValue = parseInt(value, 10);

    // Validate end_date for Published status if provided
    if (statusValue === 1 && coupon.end_date) {
      const endDate = new Date(coupon.end_date);
      if (endDate <= currentTime) {
        logger.error("end_date must be in the future for Published status");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "end_date must be in the future for Published status.",
        });
      }
    }

    coupon.status = statusValue;
    if (statusValue !== 1) {
      coupon.end_date = null;
    }
    await coupon.save();

    logger.info(`Coupon status updated for ID ${id} to ${statusValue}`);
    res.status(200).json({
      message: "Coupon status updated successfully.",
      updatedStatus: coupon.status,
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
  const currentTime = new Date();
  const whereClause = {};

  if (id) {
    whereClause.id = id;
  }
  if (title && title.trim() !== "") {
    whereClause.coupon_title = { [Op.like]: `%${title.trim()}%` };
  }

  const coupons = await Coupon.findAll({ where: whereClause });

  for (let coupon of coupons) {
    const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
    const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

    if (coupon.status === 2 && startDate && currentTime >= startDate) {
      coupon.status = 1;
      coupon.start_date = null;
      await coupon.save();
      logger.info(`Coupon ID ${coupon.id} auto-updated from Scheduled to Published`);
    }

    if (coupon.status === 1 && endDate && currentTime >= endDate) {
      coupon.status = 0;
      coupon.end_date = null;
      await coupon.save();
      logger.info(`Coupon ID ${coupon.id} auto-updated from Published to Unpublished`);
    }
  }

  if (coupons.length === 0) {
    logger.error("No matching coupons found");
    return res.status(404).json({ error: "No matching coupons found" });
  }

  logger.info("Coupons found");
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