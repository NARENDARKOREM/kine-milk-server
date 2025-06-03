const Cart = require("../../Models/Cart");
const Product = require("../../Models/Product");
const User = require("../../Models/User");
const cron = require('node-cron');
const WeightOption = require("../../Models/WeightOption");
const axios = require("axios");
const sequelize = require("../../config/db");
const StoreWeightOption = require("../../Models/StoreWeightOption");


const upsertCart = async (req, res) => {
  const uid = req.user.userId;
  if(!uid){
    return res.status(401).json({
      ResponseCode:"401",
      Result:"false",
      ResponseMsg:"Unauthorized"
    })
  }
  const {product_id, orderType, weights } = req.body;

  // Validate required fields
  if (!product_id || !orderType || !weights || !Array.isArray(weights) || weights.length === 0) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Missing or invalid required fields: uid, product_id, orderType, and non-empty weights array are required!",
    });
  }

  // Validate weights array
  for (const weight of weights) {
    if (!weight.weight_id || !Number.isInteger(weight.quantity) || weight.quantity <= 0) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Each weight object must have a valid weight_id and a positive integer quantity!",
      });
    }
  }

  let transaction;

  try {
    transaction = await sequelize.transaction();

    // Validate product
    const product = await Product.findByPk(product_id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: `Product with ID ${product_id} not found!`,
      });
    }

    // Aggregate quantities for duplicate weight_ids
    const weightMap = weights.reduce((acc, { weight_id, quantity }) => {
      acc[weight_id] = (acc[weight_id] || 0) + quantity;
      return acc;
    }, {});

    const cartItems = [];

    // Process each unique weight_id
    for (const [weight_id, quantity] of Object.entries(weightMap)) {
      // Validate weight_id
      const weightOption = await WeightOption.findOne({
        where: { id: weight_id },
        transaction,
      });
      if (!weightOption) {
        await transaction.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `Weight option with ID ${weight_id} not found!`,
        });
      }

      // Validate weight_id for product (using StoreWeightOption)
      const isValidWeight = await StoreWeightOption.findOne({
        where: {
          weight_id,
          product_id,
        },
        transaction,
      });
      if (!isValidWeight) {
        await transaction.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `Weight option ${weight_id} is not valid for product ${product_id}!`,
        });
      }

      // Check for existing cart item
      const existingCartItem = await Cart.findOne({
        where: { uid, product_id, orderType, weight_id },
        transaction,
      });

      let cartItem;

      if (existingCartItem) {
        // Update quantity
        await Cart.update(
          { quantity: existingCartItem.quantity + quantity },
          { where: { id: existingCartItem.id }, transaction }
        );
        cartItem = await Cart.findByPk(existingCartItem.id, { transaction });
        console.log(`Updated cart item: ${existingCartItem.id}, new quantity: ${cartItem.quantity}`);
      } else {
        // Create new cart item
        cartItem = await Cart.create(
          {
            uid,
            product_id,
            quantity,
            orderType,
            weight_id,
          },
          { transaction }
        );
        console.log(`Created new cart item: ${cartItem.id}`);
      }

      cartItems.push({
        id: cartItem.id,
        uid: cartItem.uid,
        product_id: cartItem.product_id,
        quantity: cartItem.quantity,
        orderType: cartItem.orderType,
        weight_id: cartItem.weight_id,
      });
    }

    await transaction.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Cart items processed successfully!",
      data: cartItems,
    });
  } catch (error) {
    console.error("Error adding/updating cart items:", error);
    if (transaction) await transaction.rollback();
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};

const getCartByUser = async (req, res) => {
  try {
    const uid = req.user?.userId;
    const { orderType } = req.params;

    console.log('Request:', { uid, orderType });

    // Validate inputs
    if (!uid) {
      return res.status(401).json({
        ResponseCode: '401',
        Result: 'false',
        ResponseMsg: 'Unauthorized: User ID is required!',
      });
    }

    if (!['Normal', 'Subscription'].includes(orderType)) {
      return res.status(400).json({
        ResponseCode: '400',
        Result: 'false',
        ResponseMsg: 'Invalid orderType! Must be "Normal" or "Subscription".',
      });
    }

    // Fetch cart items
    const cartItems = await Cart.findAll({
      where: { uid, orderType },
      include: [
        {
          model: Product,
          attributes: ['id', 'title', 'img', 'description'],
          as: 'CartproductDetails',
        },
        {
          model: WeightOption,
          as: 'cartweight',
          attributes: ['weight', 'subscribe_price', 'normal_price', 'mrp_price'],
          where: {
            id: sequelize.col('Cart.weight_id'),
          },
        
        },
      ],
    });

    return res.status(200).json({
      ResponseCode: '200',
      Result: 'true',
      ResponseMsg: cartItems.length ? 'Cart items retrieved successfully!' : 'Cart is empty.',
      data: cartItems,
    });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    return res.status(500).json({
      ResponseCode: '500',
      Result: 'false',
      ResponseMsg: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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