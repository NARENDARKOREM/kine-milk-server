const StoreWeightOption = require("../Models/StoreWeightOption");
const Product = require("../Models/Product");
const WeightOption = require("../Models/WeightOption");
const ProductInventory = require("../Models/ProductInventory");
const StoreWeightOptionHistory = require("../Models/StoreWeightOptionHistory");


const getStoreWeightOptionList = async (req, res) => {
  try {
    const { store_id, product_inventory_id } = req.query;
    const { page = 1, limit = 10 } = req.query;

    if (!store_id || !product_inventory_id) {
      return res.status(400).json({ message: "Store ID and product inventory ID are required" });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await StoreWeightOptionHistory.findAndCountAll({
      where: { product_inventory_id },
      include: [
        {
          model: WeightOption,
          as: "weightOption",
          attributes: ["weight", "normal_price", "subscribe_price", "mrp_price"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    const formattedData = rows.map((option) => ({
      id: option.id,
      weight: option.weightOption?.weight || "N/A",
      normal_price: option.weightOption?.normal_price || 0,
      subscribe_price: option.weightOption?.subscribe_price || 0,
      mrp_price: option.weightOption?.mrp_price || 0,
      quantity: option.quantity,
      subscription_quantity: option.subscription_quantity || 0,
      total: option.total,
      createdAt: option.createdAt,
    }));

    res.status(200).json({
      storeWeightOptions: formattedData,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching store weight options:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const addStoreWeightOption = async (req, res) => {
  try {
    const { product_inventory_id, store_id, weightOptions } = req.body;

    // Validate input
    if (!product_inventory_id || !store_id || !weightOptions || !Array.isArray(weightOptions)) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    // Check for duplicates in the incoming weightOptions (within the request)
    const weightIds = weightOptions.map((opt) => opt.weight_id);
    const hasDuplicates = new Set(weightIds).size !== weightIds.length;
    if (hasDuplicates) {
      return res.status(400).json({ message: "Duplicate weight options are not allowed in the request" });
    }

    // Fetch the ProductInventory to get product details
    const productInventory = await ProductInventory.findOne({
      where: { id: product_inventory_id, store_id },
      include: [{ model: Product, as: "inventoryProducts" }],
    });

    if (!productInventory) {
      return res.status(404).json({ message: "Product inventory not found" });
    }

    const product = productInventory.inventoryProducts;

    // Process each weight option
    for (const option of weightOptions) {
      const { weight_id, quantity, subscription_quantity, total } = option;

      // Validate the weight option
      if (!weight_id || quantity <= 0 || (product.subscription_required === 1 && subscription_quantity <= 0)) {
        return res.status(400).json({ message: "Invalid weight option data" });
      }

      // Fetch the weight option details
      const weightOption = await WeightOption.findOne({ where: { id: weight_id } });
      if (!weightOption) {
        return res.status(404).json({ message: "Weight option not found" });
      }

      // Check if a record exists in StoreWeightOption for this weight_id and product_inventory_id
      let existingOption = await StoreWeightOption.findOne({
        where: { product_inventory_id, weight_id },
      });

      if (existingOption) {
        // Update the existing record by adding the new quantities
        existingOption.quantity += parseInt(quantity);
        if (product.subscription_required === 1) {
          existingOption.subscription_quantity = (existingOption.subscription_quantity || 0) + parseInt(subscription_quantity);
        }
        existingOption.total = (weightOption.normal_price * existingOption.quantity) +
                              (weightOption.subscribe_price * (existingOption.subscription_quantity || 0));
        await existingOption.save();
      } else {
        // Create a new record in StoreWeightOption
        await StoreWeightOption.create({
          product_inventory_id,
          product_id: productInventory.product_id,
          weight_id,
          quantity: parseInt(quantity),
          subscription_quantity: product.subscription_required === 1 ? parseInt(subscription_quantity) : 0,
          total: (weightOption.normal_price * parseInt(quantity)) +
                 (product.subscription_required === 1 ? weightOption.subscribe_price * parseInt(subscription_quantity) : 0),
        });
      }

      // Add a new record to StoreWeightOptionHistory to log this addition
      await StoreWeightOptionHistory.create({
        product_inventory_id,
        product_id: productInventory.product_id,
        weight_id,
        quantity: parseInt(quantity),
        subscription_quantity: product.subscription_required === 1 ? parseInt(subscription_quantity) : 0,
        total: parseFloat(total),
      });
    }

    res.status(201).json({ message: "Store weight options added successfully." });
  } catch (error) {
    console.error("Error adding store weight option:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const editStoreWeightOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, subscription_quantity, total } = req.body;

    // Validation
    if (quantity == null || quantity < 0 || total == null || total < 0) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Quantity and total are required and must be non-negative.",
      });
    }

    // Find the StoreWeightOption
    const storeWeightOption = await StoreWeightOption.findOne({
      where: { id },
      include: [
        {
          model: ProductInventory,
          as: "productInventory",
          include: [
            {
              model: Product,
              as: "inventoryProducts",
            },
          ],
        },
      ],
    });

    if (!storeWeightOption) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Store weight option not found.",
      });
    }

    const product = storeWeightOption.productInventory.inventoryProducts;
    if (product.subscription_required === 1 && (subscription_quantity == null || subscription_quantity < 0)) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Subscription quantity is required and must be non-negative for subscription-required products.",
      });
    }

    // Update the StoreWeightOption
    await storeWeightOption.update({
      quantity: parseFloat(quantity),
      subscription_quantity: product.subscription_required === 1 ? parseFloat(subscription_quantity) : 0,
      total: parseFloat(total),
    });

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Store weight option updated successfully.",
      weightOption: {
        id: storeWeightOption.id,
        quantity: storeWeightOption.quantity,
        subscription_quantity: storeWeightOption.subscription_quantity,
        total: storeWeightOption.total,
      },
    });
  } catch (error) {
    console.error("Error updating store weight option:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
};

const deleteStoreWeightOption = async (req, res) => {
  try {
    const { product_inventory_id, weight_id } = req.params;

    // Validate input
    if (!product_inventory_id || !weight_id) {
      return res.status(400).json({ message: "Product inventory ID and weight ID are required" });
    }

    // Find the StoreWeightOption
    const storeWeightOption = await StoreWeightOption.findOne({
      where: { product_inventory_id, weight_id },
    });

    if (!storeWeightOption) {
      return res.status(404).json({ message: "Store weight option not found" });
    }

    // Delete the StoreWeightOption
    await storeWeightOption.destroy();

    res.status(200).json({ message: "Store weight option deleted successfully" });
  } catch (error) {
    console.error("Error deleting store weight option:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getProductInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const productInv = await ProductInventory.findOne({
      where: { id },
      include: [
        {
          model: Product,
          as: "inventoryProducts",
          attributes: [
            "id", "cat_id", "title", "img", "description", "status",
            "out_of_stock", "subscription_required", "quantity", "date",
            "discount", "batch_number", "createdAt", "updatedAt",
            "deletedAt", "pid"
          ],
          include: [
            {
              model: WeightOption,
              as: "weightOptions",
              attributes: ["id", "weight", "normal_price", "subscribe_price"],
            },
          ],
        },
      ],
    });
    if (!productInv) {
      return res.status(404).json({ message: "Product inventory not found for the given ID" });
    }
    res.status(200).json({ product: productInv.inventoryProducts });
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCurrentStoreWeightOptions = async (req, res) => {
  try {
    const { product_inventory_id } = req.params;

    const weightOptions = await StoreWeightOption.findAll({
      where: { product_inventory_id },
      include: [
        {
          model: WeightOption,
          as: "weightOption",
          attributes: ["weight", "normal_price", "subscribe_price", "mrp_price"],
        },
      ],
    });

    // Ensure no duplicates in the response
    const uniqueOptions = [];
    const seenWeightIds = new Set();
    for (const option of weightOptions) {
      if (!seenWeightIds.has(option.weight_id)) {
        seenWeightIds.add(option.weight_id);
        uniqueOptions.push(option);
      }
    }

    res.status(200).json(uniqueOptions);
  } catch (error) {
    console.error("Error fetching current store weight options:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getCurrentStoreWeightOptions, getStoreWeightOptionList, addStoreWeightOption, editStoreWeightOption, deleteStoreWeightOption, getProductInventory };