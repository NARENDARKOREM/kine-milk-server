const Cart = require("../../Models/Cart");
const Product = require("../../Models/Product");
const User = require("../../Models/User");
const cron = require('node-cron');
const WeightOption = require("../../Models/WeightOption");
const axios = require("axios");
const sequelize = require("../../config/db");
const StoreWeightOption = require("../../Models/StoreWeightOption");



const upsertCart = async (req, res) => {
  const uid = req.user?.userId;
  const { product_id, orderType, weights } = req.body;

  // Validate user
  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized",
    });
  }

  // Validate required fields
  if (!product_id || !orderType || !weights || !Array.isArray(weights) || weights.length === 0) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Missing or invalid required fields: product_id, orderType, and non-empty weights array are required!",
    });
  }

  if (!["Normal", "Subscription"].includes(orderType)) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: 'Invalid orderType! Must be "Normal" or "Subscription".',
    });
  }

  // Validate weights array
  for (const weight of weights) {
    if (!weight.store_weight_id || !Number.isInteger(weight.quantity) || weight.quantity <= 0) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Each weight object must have a valid store_weight_id and a positive integer quantity!",
      });
    }
  }

  let transaction;

  try {
    transaction = await sequelize.transaction();

    // Validate product
    const product = await Product.findOne({
      where: { id: product_id },
      attributes: ["id", "title", "img"],
      transaction,
    });

    if (!product) {
      throw new Error(`Product ID ${product_id} not found`);
    }

    // Aggregate quantities for duplicate store_weight_ids
    const weightMap = weights.reduce((acc, { store_weight_id, quantity }) => {
      acc[store_weight_id] = (acc[store_weight_id] || 0) + quantity;
      return acc;
    }, {});

    const cartItems = [];
    const skippedItems = [];

    // Process each unique store_weight_id
    for (const [store_weight_id, quantity] of Object.entries(weightMap)) {
      // Validate store_weight_id
      const storeWeightOption = await StoreWeightOption.findOne({
        where: { id: store_weight_id, product_id },
        include: [
          {
            model: WeightOption,
            as: "weightOption",
            attributes: ["id", "weight", "subscribe_price", "normal_price", "mrp_price"],
          },
        ],
        transaction,
      });

      if (!storeWeightOption) {
        console.log(`Store weight option ${store_weight_id} not found for product ${product_id}`);
        skippedItems.push({
          store_weight_id,
          quantity,
          reason: `Store weight option not found for product ${product_id}`,
        });
        continue;
      }

      // Check for existing cart item
      const existingCartItem = await Cart.findOne({
        where: { uid, product_id, orderType, store_weight_id },
        transaction,
      });

      let cartItem;

      if (existingCartItem) {
        const newQuantity = existingCartItem.quantity + quantity;
        console.log(`Updating cart item ${existingCartItem.id}: old quantity=${existingCartItem.quantity}, adding=${quantity}, new=${newQuantity}`);
        await Cart.update(
          { quantity: newQuantity },
          { where: { id: existingCartItem.id }, transaction }
        );
        cartItem = await Cart.findByPk(existingCartItem.id, {
          include: [
            {
              model: StoreWeightOption,
              as: "storeWeightOption",
              attributes: ["id"],
              include: [
                {
                  model: WeightOption,
                  as: "weightOption",
                  attributes: ["id", "weight", "subscribe_price", "normal_price", "mrp_price"],
                },
              ],
            },
            {
              model: Product,
              as: "CartproductDetails",
              attributes: ["id", "title", "img"],
            },
          ],
          transaction,
        });
      } else {
        cartItem = await Cart.create(
          {
            id: sequelize.fn("uuid"),
            uid,
            product_id,
            quantity,
            orderType,
            store_weight_id,
          },
          {
            include: [
              {
                model: StoreWeightOption,
                as: "storeWeightOption",
                attributes: ["id"],
                include: [
                  {
                    model: WeightOption,
                    as: "weightOption",
                    attributes: ["id", "weight", "subscribe_price", "normal_price", "mrp_price"],
                  },
                ],
              },
              {
                model: Product,
                as: "CartproductDetails",
                attributes: ["id", "title", "img"],
              },
            ],
            transaction,
          }
        );
        console.log(`Created cart item ${cartItem.id}: quantity=${quantity}`);
      }

      cartItems.push({
        id: cartItem.id,
        uid: cartItem.uid,
        product_id: cartItem.product_id,
        quantity: cartItem.quantity,
        orderType: cartItem.orderType,
        store_weight_id: cartItem.store_weight_id,
        weightOption: cartItem.storeWeightOption?.weightOption,
        product: cartItem.product,
      });
    }

    await transaction.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Cart items processed successfully!",
      data: cartItems,
      skippedItems,
    });
  } catch (error) {
    console.error("Error adding/updating cart items:", error);
    if (transaction) await transaction.rollback();
    return res.status(500).json({
      code: "50000",
      Result: "false",
      message: "Server error adding/updating cart items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


const getCartByUser = async (req, res) => {
  try {
    const uid = req.user?.userId;
    const { orderType } = req.params;

    console.log("Request:", { uid, orderType });

    // Validate inputs
    if (!uid) {
      return res.status(401).json({
        ResponseCode: "401",
        Result: "false",
        ResponseMsg: "Unauthorized: User ID is required!",
      });
    }

    if (!["Normal", "Subscription"].includes(orderType)) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: 'Invalid orderType! Must be "Normal" or "Subscription".',
      });
    }

    // Fetch cart items
    const cartItems = await Cart.findAll({
      where: { uid, orderType },
      include: [
        {
          model: Product,
          attributes: ["id", "title", "img", "description"],
          as: "CartproductDetails",
          required: false,
        },
        {
          model: StoreWeightOption,
          as: "storeWeightOption",
          attributes: ["id", "product_id", "weight_id", "quantity", "total"],
          include: [
            {
              model: WeightOption,
              as: "weightOption",
              attributes: ["weight", "subscribe_price", "normal_price", "mrp_price"],
            },
          ],
          required: false, // Ensure cart items are returned even if StoreWeightOption is missing
        },
      ],
    });

    // Debug: Log missing StoreWeightOption
    for (const item of cartItems) {
      if (!item.storeWeightOption && item.store_weight_id) {
        console.warn(`Cart item ${item.id} (store_weight_id: ${item.store_weight_id}) has no matching StoreWeightOption`);
      }
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: cartItems.length ? "Cart items retrieved successfully!" : "Cart is empty.",
      data: cartItems,
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

  const deleteCart = async (req, res) => {
    const { id } = req.params;
    const uid = req.user.userId;
try {
  
  const cartItem = await Cart.destroy({ where: { id,uid },force:true });

  if(!cartItem){
    return res.status(404).json({
      ResponseCode: "404",
      Result: "false",
      ResponseMsg: "Cart item not found!",
    })
  }

  return res.status(200).json({
    ResponseCode: "200",
    Result: "true",
    ResponseMsg: "Cart item deleted successfully!",
  })



} catch (error) {
  
  console.error("Error deleting cart item:", error);
  res.status(500).json({
    ResponseCode: "500",
    Result: "false",
    ResponseMsg: "Server Error",
    error: error.message,
  })
}

  }

  const sendDailyCartNotifications = async () => {
    try {
      // Find users with items in their cart
      const userWithCartItems = await Cart.findAll({
        attributes: ["uid"],
        group: ["uid"],
      });
  
      const userIds = userWithCartItems.map((cart) => cart.uid); // Fix: Use uid, not id
      if (userIds.length === 0) {
        console.log("No users with items in the cart.");
        return;
      }
  
      // Fetch users with their one_subscription
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ["id", "name", "one_subscription"],
      });
  
      if (users.length === 0) {
        console.log("No matching users found.");
        return;
      }
  
      // Send notifications to each user
      for (const user of users) {
        if (!user.one_subscription) {
          console.warn(`User ${user.id} (${user.name}) has no OneSignal subscription ID`);
          continue; // Skip if no subscription
        }
  
        try {
          const notificationContent = {
            app_id: process.env.ONESIGNAL_CUSTOMER_APP_ID,
            include_player_ids: [user.one_subscription],
            data: { user_id: user.id, type: "cart reminder" },
            contents: {
              en: `${user.name}, you have items in your cart. Complete your purchase today!`,
            },
            headings: { en: "Don't forget your cart!" },
          };
  
          const response = await axios.post(
            "https://onesignal.com/api/v1/notifications",
            notificationContent,
            {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Basic ${process.env.ONESIGNAL_CUSTOMER_API_KEY}`,
              },
            }
          );
  
          if (response.data.errors) {
            throw new Error(response.data.errors[0]);
          }
          console.log(`Notification sent to ${user.name} (${user.id}):`, response.data);
        } catch (error) {
          const errorMsg = error.response?.data?.errors?.[0] || error.message;
          console.error(`Failed to send notification to ${user.name} (${user.id}): ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error("Error in sending daily cart notifications:", error.message);
    }
  };
  
  // Schedule to run daily at 10:00 PAM
  cron.schedule("00 10 * * *", () => {
    console.log("Running daily cart notification job at 10:00 AM...");
    sendDailyCartNotifications();
  });

  module.exports = {
    upsertCart,
    getCartByUser,
    deleteCart,
    sendDailyCartNotifications
  }