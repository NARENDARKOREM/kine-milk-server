const asyncHandler = require("../middlewares/errorHandler");
const Product = require("../Models/Product");
const ProductInventory = require("../Models/ProductInventory");
const Store = require("../Models/Store");
const Coupon = require("../Models/Coupon");
const WeightOption = require("../Models/WeightOption");
const StoreWeightOption = require("../Models/StoreWeightOption");
const Categories = require("../Models/Category");


const upsertInventory = async (req, res) => {
  const { id, store_id, product_id, date, coupons } = req.body;
  console.log("Inventory request body:", req.body);

  try {
    // Validation
    if (!store_id || !product_id) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "All fields (store_id, product_id) are required.",
      });
    }

    // Validate store and product
    const store = await Store.findOne({ where: { id: store_id } });
    if (!store) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Store not found.",
      });
    }

    const product = await Product.findOne({ where: { id: product_id } });
    if (!product) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Product not found.",
      });
    }

    if (!id) {
      // Check for duplicate inventory
      const existingInventory = await ProductInventory.findOne({
        where: { store_id, product_id },
      });
      if (existingInventory) {
        return res.status(409).json({
          ResponseCode: "409",
          Result: "false",
          ResponseMsg: "This product is already added. Please go to the product list and modify it.",
        });
      }
    }

    let inventory;
    if (id) {
      // Update existing inventory
      inventory = await ProductInventory.findOne({ where: { id } });
      if (!inventory) {
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Inventory not found.",
        });
      }
      inventory.date = date || inventory.date;
      inventory.Coupons = coupons || inventory.Coupons;
      await inventory.save();

      console.log("Inventory updated successfully:", inventory.toJSON());
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Product inventory updated successfully.",
        inventory: inventory.toJSON(),
      });
    } else {
      // Create new inventory
      inventory = await ProductInventory.create({
        store_id,
        product_id,
        date: date || new Date().toISOString().split("T")[0],
        Coupons: coupons,
        status: 1,
      });

      console.log("Inventory created successfully:", inventory.toJSON());
      return res.status(201).json({
        ResponseCode: "201",
        Result: "true",
        ResponseMsg: "Product inventory created successfully.",
        inventory: inventory.toJSON(),
      });
    }
  } catch (error) {
    console.error("Error processing inventory upsert:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
};

const getProductInventoryById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const productInv = await ProductInventory.findByPk(id, {
      include: [
        {
          model: Product,
          as: "inventoryProducts",
          attributes: ['id', 'title', 'subscription_required'], // Include subscription_required
        },
        {
          model: StoreWeightOption,
          as: "storeWeightOptions",
          include: [{ model: WeightOption, as: "weightOption" }],
          attributes: ['id', 'product_inventory_id', 'product_id', 'weight_id', 'quantity', 'subscription_quantity', 'total'],
        },
      ],
    });

    if (!productInv) {
      return res.status(404).json({ message: "Product Inventory not found" });
    }

    const allCoupons = await Coupon.findAll();
    
    // Handle different coupon ID formats
    let couponIds = [];
    if (Array.isArray(productInv.Coupons)) {
      couponIds = productInv.Coupons;
    } else if (typeof productInv.Coupons === 'string') {
      try {
        couponIds = JSON.parse(productInv.Coupons);
      } catch (e) {
        console.error("Failed to parse Coupons field:", productInv.Coupons);
        couponIds = [];
      }
    }

    const coupons = couponIds.map((couponId) => {
      const coupon = allCoupons.find((c) => c.id === couponId);
      return coupon ? {
        id: coupon.id,
        coupon_title: coupon.coupon_title,
        coupon_value: coupon.coupon_val,
      } : null;
    }).filter(Boolean);

    const response = {
      ...productInv.toJSON(),
      coupons,
      storeWeightOptions: productInv.storeWeightOptions.map((option) => ({
        ...option.toJSON(),
        weight: option.weightOption?.weight,
        normal_price: option.weightOption?.normal_price || null,
        subscription_price: option.weightOption?.subscribe_price || null,
        mrp_price: option.weightOption?.mrp_price || null,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getProductInventoryById:", error);
    res.status(500).json({ message: "Failed to fetch product inventory details" });
  }
};

const ProductInventoryList = async (req, res) => {
  try {
    const { store_id } = req.query;

    const testWeightOption = await WeightOption.findOne();
    console.log('Sample WeightOption:', testWeightOption?.toJSON());

    const where = store_id ? { store_id } : {};

    const productInv = await ProductInventory.findAll({
      where,
      include: [
        {
          model: Product,
          as: "inventoryProducts",
          include: [
            {
              model: Categories,
              as: "category",
              attributes: ["id", "title"],
            },
          ],
          attributes: ['id', 'title', 'subscription_required', 'img'], // Added 'img'
        },
        {
          model: StoreWeightOption,
          as: "storeWeightOptions",
          include: [
            {
              model: WeightOption,
              as: "weightOption",
              required: false,
              attributes: ['id', 'weight', 'normal_price', 'subscribe_price', 'mrp_price'],
            },
          ],
          attributes: ['id', 'product_inventory_id', 'product_id', 'weight_id', 'quantity', 'subscription_quantity', 'total'],
        },
      ],
    });

    const allCoupons = await Coupon.findAll();

    const response = productInv?.map((inventory) => {
      let couponIds = [];
      if (Array.isArray(inventory.Coupons)) {
        couponIds = inventory.Coupons;
      } else if (typeof inventory.Coupons === 'string') {
        try {
          couponIds = JSON.parse(inventory.Coupons);
        } catch (e) {
          console.error("Failed to parse Coupons field:", inventory.Coupons);
          couponIds = [];
        }
      }

      const coupons = couponIds
        ?.map((couponId) => {
          const coupon = allCoupons.find((c) => c.id === couponId);
          return coupon
            ? {
                id: coupon.id,
                coupon_title: coupon.coupon_title,
                coupon_value: coupon.coupon_val,
              }
            : null;
        })
        .filter(Boolean);

      const storeWeightOptions = inventory.storeWeightOptions.map((option) => {
        console.log('StoreWeightOption:', option.toJSON());
        const weightOption = option.weightOption;
        console.log('Associated WeightOption:', weightOption?.toJSON());

        return {
          id: option.id,
          product_inventory_id: option.product_inventory_id,
          product_id: option.product_id,
          weight_id: option.weight_id,
          quantity: option.quantity,
          subscription_quantity: option.subscription_quantity,
          total: option.total,
          weight: weightOption?.weight || "N/A",
          normal_price: weightOption?.normal_price || option.normal_price || null,
          subscription_price: weightOption?.subscribe_price || option.subscription_price || null,
          mrp_price: weightOption?.mrp_price || option.mrp_price || null,
        };
      });

      return {
        ...inventory.toJSON(),
        coupons,
        storeWeightOptions,
      };
    }) || [];

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in ProductInventoryList:", error);
    res.status(500).json({ message: "Failed to fetch product inventory list" });
  }
};

module.exports = ProductInventoryList;

const toggleProductInventoryStatus = async (req, res) => {
  const { id, value } = req.body;
  try {
    const productInv = await ProductInventory.findByPk(id);
    if (!productInv) {
      return res.status(404).json({ message: "Product Inventory not found" });
    }
    productInv.status = value;
    await productInv.save();
    res.status(200).json({
      message: "Product Inventory status updated successfully",
      updatedStatus: productInv.status,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteProductInventory = async (req, res) => {
  const { id } = req.params;
  const { forceDelete } = req.body;
  try {
    const productInv = await ProductInventory.findByPk(id);
    if (!productInv) {
      return res.status(404).json({ message: "Product Inventory not found" });
    }
    if (productInv.deletedAt && forceDelete !== true) {
      return res.status(400).json({ message: "Product Inventory already deleted" });
    }
    if (forceDelete === true) {
      await productInv.destroy({ force: true });
      return res
        .status(200)
        .json({ message: "Product Inventory permanently deleted successfully" });
    }
    await productInv.destroy();
    await StoreWeightOption.destroy({ where: { product_inventory_id: id } });
    return res.status(200).json({ message: "Product Inventory soft deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getProductsbyStore = async (req, res, next) => {
  try {
    const { store_id } = req.params;
    console.log("Store ID:", store_id);

    if (!store_id) {
      return res.status(400).json({ message: "Store ID is required" });
    }

    const store = await Store.findOne({
      where: { id: store_id },
      attributes: ["catid"],
    });
    console.log("Store:", store);

    if (!store || !store.catid) {
      return res.status(404).json({ message: "Store not found or no categories linked" });
    }

    let categoryIds;
    try {
      categoryIds = JSON.parse(store.catid);
    } catch (error) {
      categoryIds = store.catid.split(",").map((id) => id.trim());
    }

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(200).json({ message: "No categories found for this store", categories: [] });
    }

    const categories = await Categories.findAll({
      where: { id: categoryIds },
      attributes: ["id", "title", "status"],
    });

    if (!categories.length) {
      return res.status(200).json({ message: "No valid categories found", categories: [] });
    }

    const products = await Product.findAll({
      where: { cat_id: categoryIds },
      include: [
        {
          model: WeightOption,
          as: "weightOptions",
          attributes: ["id", "weight", "subscribe_price", "normal_price", "mrp_price"],
        },
      ],
      attributes: [
        "id",
        "cat_id",
        "title",
        "img",
        "description",
        "status",
        "out_of_stock",
        "subscription_required",
        "quantity",
        "date",
        "discount",
      ],
    });
    console.log("Fetched products:", products);

    const response = {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.title,
        status: category.status,
        products: products
          .filter((product) => product.cat_id === category.id)
          .map((product) => ({
            id: product.id,
            title: product.title,
            img: product.img,
            description: product.description,
            status: product.status,
            out_of_stock: product.out_of_stock,
            subscription_required: product.subscription_required,
            quantity: product.quantity,
            date: product.date,
            discount: product.discount,
            weightOptions: product.weightOptions || [],
          })),
      })),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching categories and products:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteInventoryStoreWeightOptions = async (req, res) => {
  const { inventory_id, weight_id } = req.body;
  try {
    const storeWeightOption = await StoreWeightOption.findOne({
      where: { product_inventory_id: inventory_id, weight_id: weight_id },
    });
    if (!storeWeightOption) {
      return res.status(404).json({ message: "Store Weight Option not found" });
    }
    await storeWeightOption.destroy();
    res.status(200).json({ message: "Store Weight Option deleted successfully" });
  } catch (error) {
    console.error("Error deleting Store Weight Option:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  upsertInventory,
  getProductInventoryById,
  ProductInventoryList,
  toggleProductInventoryStatus,
  deleteProductInventory,
  getProductsbyStore,
  deleteInventoryStoreWeightOptions,
};