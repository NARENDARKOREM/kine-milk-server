const Product = require("../Models/Product");
const { Op } = require("sequelize");
const asyncHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const uploadToS3 = require("../config/fileUpload.aws");
const Store = require("../Models/Store");
const WeightOption = require("../Models/WeightOption")
const ProductImage = require("../Models/productImages");
const ProductInventory = require("../Models/ProductInventory")
const StoreWeightOption = require("../Models/StoreWeightOption")

const upsertProduct = async (req, res) => {
  try {
    const {
      id,
      title,
      status,
      cat_id,
      description,
      out_of_stock,
      subscription_required,
      weightOptions,
      discount,
      batch_number,
      package_type
    } = req.body;

    console.log("Request body:", req.body);

    // Validate required fields
    if (
      !title ||
      !status ||
      !cat_id ||
      !description ||
      !out_of_stock ||
      !subscription_required ||
      !weightOptions ||
      !package_type ||
      !batch_number // Added batch_number to validation
    ) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "All fields are required, including batch_number.",
      });
    }

    // Validate batch_number format
    const batchNumberRegex = /^[A-Za-z0-9-]+$/;
    if (!batchNumberRegex.test(batch_number)) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Batch number must be alphanumeric with optional hyphens.",
      });
    }
    if (batch_number.length > 50) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Batch number must be 50 characters or less.",
      });
    }

    // Parse weightOptions
    let parsedWeightOptions;
    try {
      parsedWeightOptions = JSON.parse(weightOptions);
    } catch (error) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid weightOptions format. Must be a valid JSON string.",
      });
    }

    // Validate weightOptions
    if (!Array.isArray(parsedWeightOptions) || parsedWeightOptions.length === 0) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "At least one weight option is required.",
      });
    }

    for (const option of parsedWeightOptions) {
      if (
        !option.weight ||
        !option.subscribe_price ||
        !option.normal_price ||
        !option.mrp_price
      ) {
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "All fields in weight options (weight, subscribe_price, normal_price, mrp_price) are required.",
        });
      }
    }

    let imageUrl = null;
    if (req.files?.img) {
      imageUrl = await uploadToS3(req.files.img[0], "images");
    }
    console.log("Image URL:", imageUrl);

    let product;
    if (id) {
      // Update existing product
      product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Product not found.",
        });
      }

      await product.update({
        title,
        img: imageUrl || product.img,
        status,
        cat_id,
        description,
        out_of_stock,
        subscription_required,
        discount: discount || product.discount,
        batch_number, // Ensure batch_number is updated
        package_type
      });

      // Fetch existing WeightOption records
      const oldWeightOptions = await WeightOption.findAll({
        where: { product_id: id },
      });
      const oldWeightMap = new Map(
        oldWeightOptions.map(wo => [wo.weight, wo])
      );

      // Determine which WeightOption records to update, create, or delete
      const newWeights = new Set(parsedWeightOptions.map(opt => opt.weight));
      const oldWeights = new Set(oldWeightOptions.map(wo => wo.weight));

      // Helper function to compute Set difference
      const setDifference = (setA, setB) => {
        const diff = new Set();
        for (const item of setA) {
          if (!setB.has(item)) {
            diff.add(item);
          }
        }
        return diff;
      };

      // Update or create WeightOption records
      const weightOptionPromises = parsedWeightOptions.map(async (option) => {
        const existingWeightOption = oldWeightMap.get(option.weight);
        if (existingWeightOption) {
          // Update existing WeightOption
          await existingWeightOption.update({
            weight: option.weight,
            subscribe_price: parseFloat(option.subscribe_price),
            normal_price: parseFloat(option.normal_price),
            mrp_price: parseFloat(option.mrp_price),
          });
          return existingWeightOption;
        } else {
          // Create new WeightOption
          return await WeightOption.create({
            product_id: id,
            weight: option.weight,
            subscribe_price: parseFloat(option.subscribe_price),
            normal_price: parseFloat(option.normal_price),
            mrp_price: parseFloat(option.mrp_price),
          });
        }
      });

      const newWeightOptions = await Promise.all(weightOptionPromises);

      // Delete WeightOption records that are no longer needed
      const weightsToDelete = setDifference(oldWeights, newWeights);
      if (weightsToDelete.size > 0) {
        await WeightOption.destroy({
          where: {
            product_id: id,
            weight: Array.from(weightsToDelete),
          },
        });
      }

      // Create a map of weight to new WeightOption for easier lookup
      const newWeightMap = new Map(
        newWeightOptions.map(wo => [wo.weight, wo])
      );

      // Fetch all ProductInventory records for the product
      const inventories = await ProductInventory.findAll({
        where: { product_id: id },
        include: [{ model: StoreWeightOption, as: "storeWeightOptions" }],
      });

      // Update StoreWeightOption records for each inventory
      for (const inventory of inventories) {
        const oldStoreWeightOptions = inventory.storeWeightOptions || [];
        const weightIdToWeightMap = new Map(
          oldWeightOptions.map(wo => [wo.id, wo.weight])
        );
        const storeWeightMap = new Map();
        for (const swo of oldStoreWeightOptions) {
          const weight = weightIdToWeightMap.get(swo.weight_id);
          if (weight) {
            storeWeightMap.set(weight, swo);
          }
        }

        const processedWeights = new Set();

        const storeWeightOptionPromises = parsedWeightOptions.map(async (option) => {
          const newWeightOption = newWeightMap.get(option.weight);
          const existingStoreWeightOption = storeWeightMap.get(option.weight);

          processedWeights.add(option.weight);

          if (existingStoreWeightOption) {
            await existingStoreWeightOption.update({
              weight_id: newWeightOption.id,
              product_id: id,
              quantity: existingStoreWeightOption.quantity,
              subscription_quantity: existingStoreWeightOption.subscription_quantity || 0,
              total: existingStoreWeightOption.total,
            });
            return existingStoreWeightOption;
          } else {
            return await StoreWeightOption.create({
              product_inventory_id: inventory.id,
              product_id: id,
              weight_id: newWeightOption.id,
              quantity: 0,
              subscription_quantity: 0,
              total: 0,
            });
          }
        });

        await Promise.all(storeWeightOptionPromises);

        const storeWeightsToDelete = setDifference(oldWeights, newWeights);
        if (storeWeightsToDelete.size > 0) {
          const weightIdsToDelete = oldWeightOptions
            .filter(wo => storeWeightsToDelete.has(wo.weight))
            .map(wo => wo.id);
          await StoreWeightOption.destroy({
            where: {
              product_inventory_id: inventory.id,
              weight_id: weightIdsToDelete,
            },
          });
        }

        const remainingStoreWeightOptions = await StoreWeightOption.findAll({
          where: { product_inventory_id: inventory.id },
        });
        const seenWeights = new Set();
        const storeWeightOptionsToDelete = [];
        for (const swo of remainingStoreWeightOptions) {
          const weight = weightIdToWeightMap.get(swo.weight_id) || newWeightMap.get(swo.weight_id)?.weight;
          if (weight) {
            if (seenWeights.has(weight)) {
              storeWeightOptionsToDelete.push(swo.id);
            } else {
              seenWeights.add(weight);
            }
          }
        }
        if (storeWeightOptionsToDelete.length > 0) {
          await StoreWeightOption.destroy({
            where: {
              id: storeWeightOptionsToDelete,
            },
          });
        }
      }

      console.log("Product updated successfully:", product.toJSON());
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Product updated successfully.",
        product,
      });
    } else {
      // Check for duplicate title
      const existingProduct = await Product.findOne({ where: { title } });
      if (existingProduct) {
        return res.status(409).json({
          ResponseCode: "409",
          Result: "false",
          ResponseMsg: "Product with this title already exists.",
        });
      }

      // Create new product
      product = await Product.create({
        title,
        img: imageUrl,
        status,
        cat_id,
        description,
        out_of_stock,
        subscription_required,
        discount: discount || "",
        batch_number, // Ensure batch_number is included
        package_type
      });

      // Create new weight options
      const weightOptionEntries = parsedWeightOptions.map((option) => ({
        product_id: product.id,
        weight: option.weight,
        subscribe_price: parseFloat(option.subscribe_price),
        normal_price: parseFloat(option.normal_price),
        mrp_price: parseFloat(option.mrp_price),
      }));
      await WeightOption.bulkCreate(weightOptionEntries);

      console.log("Product created successfully:", product.toJSON());
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Product created successfully.",
        product,
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
};


const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: WeightOption, as: "weightOptions" }], // Assuming association is set
    });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error)
  }
};



const getProductCount = asyncHandler(async (req, res) => {
  const ProductCount = await Product.count();
  const Products = await Product.findAll();
  logger.info("product counted successfully");
  res.status(200).json({ Products, Product: ProductCount });
});

const getProductById = asyncHandler(async (req, res) => {
  // Uncomment and use Joi validation if needed
  // const { error } = getproductByIdSchema.validate(req.params);
  // if (error) {
  //   logger.error(error.details[0].message);
  //   return res.status(400).json({ error: error.details[0].message });
  // }

  const { id } = req.params;

  // Fetch product with associated weightOptions
  const product = await Product.findOne({
    where: { id: id },
    include: [
      {
        model: WeightOption,
        as: "weightOptions", // Alias for the association (ensure this matches your model definition)
        attributes: ["weight", "subscribe_price", "normal_price", "mrp_price"], // Select specific fields
      },
    ],
  });

  if (!product) {
    logger.error("Product not found");
    return res.status(404).json({
      ResponseCode: "404",
      Result: "false",
      ResponseMsg: "Product not found",
    });
  }

  // Format the response to match your API style
  res.status(200).json({
    ResponseCode: "200",
    Result: "true",
    ResponseMsg: "Product retrieved successfully",
    data: {
      id: product.id,
      title: product.title,
      img: product.img,
      status: product.status,
      discount:product.discount,
      cat_id: product.cat_id,
      description: product.description,
      out_of_stock: product.out_of_stock,
      subscription_required: product.subscription_required,
      package_type: product.package_type,
      batch_number: product.batch_number,
      weightOptions: product.weightOptions, // Included from the association
    },
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log("Received ID for deletion:", id);

  const product = await Product.findOne({ where: { id }, paranoid: false });

  if (!product) {
    logger.error(`Product not found for ID: ${id}`);
    return res.status(404).json({ error: "Product not found" });
  }

  await Product.destroy({where:{id}});
  logger.info("Product deleted successfully");
  return res.status(200).json({ message: "Product deleted successfully" });
});

const searchProduct = asyncHandler(async (req, res) => {
  const { id, title } = req.body;
  const whereClause = {};
  if (id) {
    whereClause.id = id;
  }

  if (title && title.trim() != "") {
    whereClause.title = { [Sequelize.Op.like]: `%${title.trim()}%` };
  }

  const product = await Product.findAll({ where: whereClause });

  if (product.length === 0) {
    logger.error("No matching admins found");
    return res.status(404).json({ error: "No matching admins found" });
  }
  res.status(200).json(product);
});

const toggleproductStatus = async (req, res) => {
  console.log("Request received:", req.body);

  const { id, value } = req.body;
  console.log(req.body, "ssssssssssssssssssssssssss")

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      console.log("product not found");
      return res.status(404).json({ message: "product not found." });
    }

    product.status = value;
    await product.save();

    console.log("product updated successfully:", product);
    res.status(200).json({
      message: "product status updated successfully.",
      updatedStatus: product.status,
    });
  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  upsertProduct,
  getAllProducts,
  getProductCount,
  getProductById,
  deleteProduct,
  searchProduct,
  toggleproductStatus,
};