const CarryBag = require("../Models/Carry_Bag");
const asyncHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const uploadToS3 = require("../config/fileUpload.aws");

const upsertCarryBag = asyncHandler(async (req, res) => {
  const { id, planType, status, cost } = req.body;

  try {
    // Validate inputs
    const validPlanTypes = ["Instant", "Subscribe"];
    if (!validPlanTypes.includes(planType)) {
      logger.error("Invalid planType value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "planType must be 'Instant' or 'Subscribe'.",
      });
    }

    const validStatuses = [0, 1];
    if (!validStatuses.includes(parseInt(status))) {
      logger.error("Invalid status value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published).",
      });
    }

    // Cost is optional; default to 0 if not provided
    let costValue = 0;
    if (cost) {
      costValue = parseFloat(cost);
      if (isNaN(costValue) || costValue < 0) {
        logger.error("Invalid cost value");
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cost must be a non-negative number.",
        });
      }
    }

    let imageUrl;
    if (req.file) {
      imageUrl = await uploadToS3(req.file, "image");
    } else if (!id) {
      logger.error("Image is required for a new carry bag");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Image is required for a new carry bag.",
      });
    }

    let carryBag;
    if (id) {
      carryBag = await CarryBag.findByPk(id);
      if (!carryBag) {
        logger.error(`Carry bag with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Carry bag not found.",
        });
      }

      await carryBag.update({
        planType,
        status: parseInt(status),
        cost: costValue,
        bagImage: imageUrl || carryBag.bagImage,
      });

      logger.info(`Carry bag with ID ${id} updated successfully`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Carry bag updated successfully.",
        carryBag,
      });
    } else {
      carryBag = await CarryBag.create({
        planType,
        status: parseInt(status),
        cost: costValue,
        bagImage: imageUrl,
      });

      logger.info(`Carry bag created with ID ${carryBag.id}`);
      return res.status(201).json({
        ResponseCode: "201",
        Result: "true",
        ResponseMsg: "Carry bag created successfully.",
        carryBag,
      });
    }
  } catch (error) {
    logger.error(`Error processing carry bag: ${error.message}`);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const getAllCarryBags = asyncHandler(async (req, res) => {
  try {
    const carryBags = await CarryBag.findAll();
    const cleanedCarryBags = carryBags.map((carryBag) => {
      const data = carryBag.toJSON();
      if (data.bagImage && typeof data.bagImage === "string") {
        data.bagImage = data.bagImage.replace(/^"|"$/g, "");
      }
      return data;
    });
    logger.info("Successfully retrieved all carry bags");
    res.status(200).json(cleanedCarryBags);
  } catch (error) {
    logger.error(`Error retrieving carry bags: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve carry bags", error });
  }
});

const getCarryBagById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const carryBag = await CarryBag.findByPk(id);
    if (!carryBag) {
      logger.error(`Carry bag with ID ${id} not found`);
      return res.status(404).json({ error: "Carry bag not found" });
    }
    const data = carryBag.toJSON();
    if (data.bagImage && typeof data.bagImage === "string") {
      data.bagImage = data.bagImage.replace(/^"|"$/g, "");
    }
    logger.info(`Carry bag with ID ${id} found`);
    res.status(200).json(data);
  } catch (error) {
    logger.error(`Error retrieving carry bag by ID ${id}: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const toggleCarryBagStatus = asyncHandler(async (req, res) => {
  const { id, field, value } = req.body; // Get id, field, and value from body
  console.log(id, field, value, "fhfhfhfhfhfhf");
  try {
    const carryBag = await CarryBag.findByPk(id);
    if (!carryBag) {
      logger.error(`Carry bag with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Carry bag not found.",
      });
    }

    // Update the specified field with the provided value
    await carryBag.update({ [field]: value });
    logger.info(`Carry bag with ID ${id} ${field} updated to ${value}`);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: `Carry bag ${field} updated successfully.`,
      carryBag,
    });
  } catch (error) {
    logger.error(`Error updating carry bag ${field} for ID ${id}: ${error.message}`);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const deleteCarryBag = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const carryBag = await CarryBag.findByPk(id);
    if (!carryBag) {
      logger.error(`Carry bag with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Carry bag not found.",
      });
    }
    await carryBag.destroy();
    logger.info(`Carry bag with ID ${id} deleted successfully`);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Carry bag deleted successfully.",
    });
  } catch (error) {
    logger.error(`Error deleting carry bag with ID ${id}: ${error.message}`);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

module.exports = {
  upsertCarryBag,
  getAllCarryBags,
  getCarryBagById,
  toggleCarryBagStatus,
  deleteCarryBag,
};