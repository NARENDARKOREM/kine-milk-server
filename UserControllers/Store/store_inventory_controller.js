const Product = require("../../Models/Product");
const { Op } = require("sequelize");
const asyncHandler = require("../../middlewares/errorHandler");
const logger = require("../../utils/logger");
const uploadToS3 = require("../../config/fileUpload.aws");
const Store = require("../../Models/Store");
const ProductInventory = require("../../Models/ProductInventory");

const ListInventory = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const uid = req.user.userId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User  ID not provided",
    });
  }

  console.log("Fetching orders for user ID:", uid);
  const { storeId } = req.params;
  if (!storeId) {
    res.status(401).json({ message: "Store ID is required." });
  }
  try {
    const products = await ProductInventory.findAll({
      where: { store_id: storeId },  
      include:[
        {
             model:Product,
              as:'inventoryProducts',
              attributes:["img","title","quantity","date"],        
            }
      ]    
    });
    if (!products || products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this store!" });
    }
    return res
      .status(200)
      .json({ message: "Store Products Fetched Successfully.", products });
  } catch (error) {
    console.error("Error Fetching store products", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});

const ViewProductInventoryById = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const uid = req.user?.userId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }

  console.log("Fetching product inventory for user ID:", uid);

  const { storeId, productId } = req.body; // Ensure productId is included in the request
  if (!storeId) {
    return res.status(400).json({ message: "Store ID is required" });
  }

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  try {
    // Find a specific product by its ID and store ID
    const product = await Product.findOne({
      where: { id: productId, store_id: storeId },
      // attributes: ["id", "title", "date", "quantity", "normal_price", "mrp_price"],
    });

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found in the given store." });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Product retrieved successfully.",
      product,
    });
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: error.message, 
    });
  }
});

const AddInventory = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const uid = req.user.userId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }

  const { storeId } = req.params;
  const { productId, date, quantity } = req.body;

  if (!productId || !date || !quantity) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const product = await Product.findOne({
      where: {
        id: productId,
      },
      attributes: ["id", "title", "normal_price", "mrp_price"],
    });

    if (!product) {
      return res.status(404).json({
        ResponseCode: "402",
        Result: "false",
        message: "Product not found in the store.",
      });
    }

    const total = quantity * product.normal_price;

    const inventoryRecord = await ProductInventory.create({
      store_id: storeId, 
      product_id: productId,
      date: date,
      quantity: quantity,
      total: total,
      status: 1, 
    });

    console.log("Inventory record created successfully:", inventoryRecord);

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      message: "Product added to inventory successfully.",
      product: {
        productId: product.id,
        title: product.title,
        date: inventoryRecord.date,
        quantity: inventoryRecord.quantity,
        unit_price: product.normal_price,
        total_price: inventoryRecord.total,
      },
    });
  } catch (error) {
    console.error("Error adding product inventory:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});

const DeleteInventory = asyncHandler(async(req,res)=>{
  console.log("Decoded User:", req.user);

  const uid = req.user?.userId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }

  console.log("Fetching product inventory for user ID:", uid);
  const {productId}=req.params;
  if(!productId){
    return res.status(400).json({
      ResponceCode:"400",
      Result:"false",
      ResponseMsg:"Product ID is required"
    })
  }
  try {
    const product = await ProductInventory.findOne({where:{id:productId}})
    if(!product){
      return res.status(404).json({
        ResponceCode:"404",
        Result:"false",
        ResponseMsg:"Product not found"
      })
    }
    await ProductInventory.destroy({where:{id:productId}})
    return res.status(200).json({
      ResponceCode:"200",
      Result:"true",
      ResponseMsg:"Product deleted successfully"
    })
    
  } catch (error) {
    console.error("Error adding product inventory:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }

})

module.exports = { ListInventory, AddInventory, ViewProductInventoryById,DeleteInventory };
