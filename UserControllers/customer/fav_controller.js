const { Model } = require("firebase-admin/machine-learning");
const Favorite = require("../../Models/Favorite");
const Product = require("../../Models/Product");
const Category = require("../../Models/Category");
const WeightOption = require("../../Models/WeightOption");
const ProductInventory = require("../../Models/ProductInventory");
const StoreWeightOption = require("../../Models/StoreWeightOption");
const { Op } = require("sequelize");
const ProductImage = require("../../Models/productImages");

const addFavorite = async (req, res) => {
  try {
    const { pid, store_id } = req.body; 
    const uid = req.user.userId;

    if (!pid || !store_id || !uid) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Inventory ID, store ID, and user ID are required",
      });
    }

    const inventory = await ProductInventory.findOne({
      where: { product_id: pid, store_id: store_id },
    });

    if (!inventory || inventory.quantity === 0) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Product is not available in this store",
      });
    }

    const existingFav = await Favorite.findOne({
      where: { uid, store_id, pid: inventory.product_id },
    });

    if (existingFav) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "You already have this product in your favorites",
      });
    }

    const favorite = await Favorite.create({
      uid,
      store_id,
      pid: inventory.product_id,
    });
    console.log("Created Favorite:", favorite.toJSON());

    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Favorite added successfully!",
      favorite,
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({
      Result: "false",
      ResponseMsg: "Server error",
      error,
    });
  }
};
  
 
  // const getFavorites = async (req, res) => {
  //   try {
  //     const { store_id } = req.params;
  //     const uid = req.user.userId;
  
  //     const favorites = await Favorite.findAll({
  //       where: { uid, store_id },
  //       include: [
  //         {
  //           model: Product,
  //           as: "favproducts",
  //           include: [
  //             {
  //               model: Category,
  //               as: "category",
  //               attributes: ["id", "title"],
  //             },
  //             {
  //               model: ProductInventory,
  //               as: "productInventories",
  //               where: { store_id }, // Filter by store_id
  //               required: false, // Left join to include products even if no inventory
  //               include: [
  //                 {
  //                   model: StoreWeightOption,
  //                   as: "storeWeightOptions",
  //                   include: [
  //                     {
  //                       model: WeightOption,
  //                       as: "weightOption",
  //                       attributes: ["id", "normal_price", "subscribe_price", "mrp_price", "weight"],
  //                     },
  //                   ],
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //       ],
  //     });
  
  //     res.status(200).json({
  //       ResponseCode: "200",
  //       Result: "true",
  //       ResponseMsg: "Favorites fetched successfully!",
  //       items:favorites,
  //     });
  //   } catch (error) {
  //     console.error("Error fetching favorites:", error);
  //     res.status(500).json({ Result: false, ResponseMsg: "Server error", error });
  //   }
  // };
 
  const getFavorites = async (req, res) => {
    try {
      const { store_id } = req.params;
      const uid = req.user?.userId;
  
      if (!uid) {
        return res.status(401).json({
          ResponseCode: "401",
          Result: "false",
          ResponseMsg: "User not authenticated",
        });
      }
  
      if (!store_id) {
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Store ID is required",
        });
      }
  
      // Step 1: Get the user's favorite product IDs
      const favoriteProducts = await Favorite.findAll({
        where: { uid, store_id },
        attributes: ['pid'], // Only need product IDs
      });
  
      if (!favoriteProducts.length) {
        return res.status(200).json({
          ResponseCode: "200",
          Result: "true",
          ResponseMsg: "No favorites found for this store",
          items: [],
        });
      }
  
      const productIds = favoriteProducts.map(fav => fav.pid);
  
      // Step 2: Fetch ProductInventory records for these products in the specified store
      const inventories = await ProductInventory.findAll({
        where: {
          product_id: { [Op.in]: productIds },
          store_id,
        },
        include: [
          {
            model: Product,
            as: "inventoryProducts",
            attributes: ["id", "cat_id", "title", "img", "description"], // Match desired fields
            include: [
              {
                model: ProductImage,
                as: "extraImages",
                attributes: ["id", "product_id", "img"],
              },
              {
                model: Category,
                as: "category",
                attributes: ["id", "title"],
              },
            ],
          },
          {
            model: StoreWeightOption,
            as: "storeWeightOptions",
            include: [
              {
                model: WeightOption,
                as: "weightOption",
                attributes: [
                  "id",
                  "weight",
                  "normal_price",
                  "subscribe_price",
                  "mrp_price",
                ],
              },
            ],
          },
        ],
      });
  
      // Step 3: Map to desired response structure
      const items = inventories.map(inventory => ({
        id: inventory.id,
        product_id: inventory.product_id,
        inventoryProducts: {
          id: inventory.inventoryProducts.id,
          cat_id: inventory.inventoryProducts.cat_id,
          title: inventory.inventoryProducts.title,
          img: inventory.inventoryProducts.img,
          description: inventory.inventoryProducts.description,
          extraImages: inventory.inventoryProducts.extraImages.map(image => ({
            id: image.id,
            product_id: image.product_id,
            img: image.img,
          })),
          category: {
            id: inventory.inventoryProducts.category.id,
            title: inventory.inventoryProducts.category.title,
          },
        },
        storeWeightOptions: inventory.storeWeightOptions.map(option => ({
          id: option.id,
          product_inventory_id: option.product_inventory_id,
          product_id: option.product_id,
          weight_id: option.weight_id,
          quantity: option.quantity,
          total: option.total,
          createdAt: option.createdAt,
          updatedAt: option.updatedAt,
          deletedAt: option.deletedAt,
          weightOption: {
            id: option.weightOption.id,
            weight: option.weightOption.weight,
            normal_price: option.weightOption.normal_price,
            subscribe_price: option.weightOption.subscribe_price,
            mrp_price: option.weightOption.mrp_price,
          },
        })),
      }));
  
      res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Favorites fetched successfully!",
        items,
      });
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Server error",
        error: error.message,
      });
    }
  };

  const removeFavorite = async (req, res) => {
    try {
      const { pid, store_id } = req.body;

      const uid = req.user.userId;
  
      const deleted = await Favorite.destroy({
        where: { uid,pid, store_id },
      });
  
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Favorite not found" });
      }
  

      res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Favorite Deleted successfully!",
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ Result: false, ResponseMsg: "Server error", error });
    }
  };
  
  module.exports = { addFavorite, getFavorites, removeFavorite };