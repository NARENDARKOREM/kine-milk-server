const { Sequelize, Op } = require("sequelize");
const SubscribeOrder = require("../../Models/SubscribeOrder");
const Product = require("../../Models/Product");
const SubscribeOrderProduct = require("../../Models/SubscribeOrderProduct");
const pauseHistory = require("../../Models/PauseHistory")
const Notification = require("../../Models/Notification");
const NormalOrder = require("../../Models/NormalOrder");
const User = require("../../Models/User");
const Time = require("../../Models/Time");
const Address = require("../../Models/Address");
const Review = require("../../Models/review");
const ProductReview = require("../../Models/ProductReview");
const WalletReport = require("../../Models/WalletReport");
const db = require("../../config/db");
const Store = require("../../Models/Store");
const WeightOption = require("../../Models/WeightOption");
const Cart = require("../../Models/Cart");
const Coupon = require("../../Models/Coupon");
const axios = require("axios");
const Setting = require("../../Models/Setting");
const sequelize = require("../../config/db");
const cron = require("node-cron");
const { sendPushNotification } = require("../../notifications/alert.service");
const { sendInAppNotification } = require("../../notifications/notification.service");
const { calculateDeliveryDays2, generateOrderId } = require("../helper/orderUtils");
const asyncLib = require("async");
const StoreWeightOption = require("../../Models/StoreWeightOption");

const MAX_RETRIES = 3;

const subscribeOrder = async (req, res) => {
  const {
    coupon_id,
    products,
    o_type,
    store_id,
    address_id,
    a_note,
    tax,
    // delivery_fee,
    // store_charge,
    subtotal,
    o_total,
    is_paper_bag,
  } = req.body;

  const uid = req.user.userId;

  // Basic validations
  if (!uid || !Array.isArray(products) || products.length === 0 || !o_type || !store_id || !subtotal || !o_total) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Missing required fields!",
    });
  }

  if (o_type === "Delivery" && !address_id) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Address ID is required for Delivery orders!",
    });
  }

  // Validate product structure and dates
  const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  let referenceStartDate = null;
  let referenceEndDate = null;

  for (const item of products) {
    if (
      !item.product_id ||
      !item.store_weight_id ||
      !item.quantities ||
      typeof item.quantities !== "object" ||
      !item.timeslot_id ||
      !item.start_date ||
      !item.end_date ||
      Object.keys(item.quantities).length === 0 ||
      !Object.keys(item.quantities).every(day => validDays.includes(day.toLowerCase())) ||
      !Object.values(item.quantities).every(qty => typeof qty === "number" && qty >= 0)
    ) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid product structure, quantities, or missing start_date/end_date.",
      });
    }

    // Validate dates
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid start_date or end_date format in products!",
      });
    }

    console.log(startDate, "startDate")
    console.log(endDate, "endDate")

    // Ensure all products have the same start_date and end_date
    if (!referenceStartDate) {
      referenceStartDate = startDate;
      referenceEndDate = endDate;
    }
    // } else if (startDate.getTime() !== referenceStartDate.getTime() || endDate.getTime() !== referenceEndDate.getTime()) {
    //   console.log(referenceStartDate, "referenceStartDate")
    //   console.log(referenceEndDate, "referenceEndDate")
    //   return res.status(400).json({
    //     ResponseCode: "400",
    //     Result: "false",
    //     ResponseMsg: "All products must have the same start_date and end_date!",
    //   });
    // }
  }

  // Fetch settings for minimum subscription days
  const setting = await Setting.findOne();
  if (!setting) {
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Settings not found!",
    });
  }

  const minimumSubscriptionDays = parseInt(setting.minimum_subscription_days, 10) || 30;
  // const deliveryCharge = parseFloat(delivery_fee) || 0;
  // const storeCharge = parseFloat(store_charge) || 0;
  const settingTax = parseFloat(tax) || 0;

  // Validate subscription duration
  const minEndDate = new Date(referenceStartDate);
  minEndDate.setDate(referenceStartDate.getDate() + minimumSubscriptionDays - 1);
  if (referenceEndDate < minEndDate) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: `Subscription must be at least ${minimumSubscriptionDays} days.`,
    });
  }

  let attempt = 0;
  let orderResult = null;
  let orderItemsResult = null;
  let userData = null;
  let storeData = null;

  while (attempt < MAX_RETRIES) {
    const t = await sequelize.transaction();
    try {
      attempt++;
      console.log(`Attempt ${attempt} of ${MAX_RETRIES}`);

      // Validate user and store
      const user = await User.findOne({ where: { id: uid }, transaction: t });
      if (!user) throw new Error("User not found");

      const store = await Store.findOne({ where: { id: store_id }, transaction: t });
      if (!store) throw new Error("Store not found");

      if (o_type === "Delivery") {
        const address = await Address.findOne({ where: { id: address_id }, transaction: t });
        if (!address) throw new Error("Address not found");
      }

      // Coupon validation
      let appliedCoupon = null;
      let couponAmount = 0;
      let finalTotal = parseFloat(o_total);

      if (coupon_id) {
        const coupon = await Coupon.findByPk(coupon_id, { transaction: t });
        if (!coupon) throw new Error("Coupon not found");
        if (coupon.status !== 1 || new Date(coupon.end_date) < new Date()) throw new Error("Coupon expired");
        if (parseFloat(subtotal) < parseFloat(coupon.min_amt)) {
          throw new Error(`Subtotal < min amount (${coupon.min_amt}) for this coupon`);
        }
        couponAmount = parseFloat(coupon.coupon_val);
        finalTotal = Math.max(0, finalTotal - couponAmount);
        appliedCoupon = coupon;
      }

      // Wallet balance check
      if (user.wallet < finalTotal) {
        throw new Error(`Insufficient wallet balance. Add ₹${(finalTotal - user.wallet).toFixed(2)}`);
      }

      // Create order
      const orderId = await generateOrderId(t);
      const order = await SubscribeOrder.create(
        {
          uid,
          store_id,
          address_id: o_type === "Delivery" ? address_id : null,
          odate: new Date(),
          o_type,
          start_date: referenceStartDate,
          end_date: referenceEndDate,
          settingTax,
          d_charge: o_type === "Delivery" ? 0 : 0,
          store_charge: 0,
          cou_id: appliedCoupon ? appliedCoupon.id : null,
          cou_amt: couponAmount,
          subtotal: parseFloat(subtotal),
          o_total: finalTotal,
          a_note,
          order_id: orderId,
          status: "Pending",
          is_paper_bag
        },
        { transaction: t }
      );

      // Create order items
      const orderItems = await Promise.all(
        products.map(async item => {
          const schedule = {};
          validDays.forEach(day => {
            schedule[day] = item.quantities[day.toLowerCase()] || 0;
          });

          const days = Object.keys(item.quantities).filter(day => validDays.includes(day.toLowerCase()) && item.quantities[day] > 0);

          return SubscribeOrderProduct.create(
            {
              oid: order.id,
              product_id: item.product_id,
              store_weight_id: item.store_weight_id,
              price: item.product_total || 0, // Use frontend-provided price if available, else 0
              timeslot_id: item.timeslot_id,
              schedule,
              start_date: referenceStartDate,
              end_date: referenceEndDate,
              repeat_day: days,
              status: "Pending",
              order_id: orderId,
            },
            { transaction: t }
          );
        })
      );

      // Remove cart items
      await Cart.destroy({
        where: {
          [Op.or]: products.map(item => ({
            uid,
            product_id: item.product_id,
            orderType: "Subscription",
            store_weight_id: item.store_weight_id,
          })),
        },
        transaction: t,
      });

      // Update wallet
      await user.update({ wallet: user.wallet - finalTotal }, { transaction: t });

      // Create wallet report
      await WalletReport.create(
        {
          uid,
          amt: finalTotal,
          message: `Subscription order placed. ₹${finalTotal} debited.`,
          transaction_no: order.order_id,
          tdate: new Date(),
          transaction_type: "Debited",
          status: 1,
        },
        { transaction: t }
      );

      // Store results
      orderResult = order;
      orderItemsResult = orderItems;
      userData = user;
      storeData = store;

      await t.commit();
      break;
    } catch (error) {
      if (!t.finished) await t.rollback();
      if (error.original?.code === "ER_LOCK_DEADLOCK" && attempt < MAX_RETRIES) {
        console.warn(`Deadlock detected on attempt ${attempt}, retrying...`);
        continue;
      }
      console.error("Transaction error:", error);
      return res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Server Error",
        error: error.message,
      });
    }
  }

  if (!orderResult) {
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "All retry attempts failed due to deadlocks or other errors.",
    });
  }

  // Send notifications after commit
  try {
    await Promise.all([
      sendPushNotification({
        appId: process.env.ONESIGNAL_CUSTOMER_APP_ID,
        apiKey: process.env.ONESIGNAL_CUSTOMER_API_KEY,
        playerIds: [userData.one_subscription],
        data: { user_id: userData.id, type: "Subscription order confirmed" },
        contents: { en: `${userData.name}, Your subscription order has been confirmed! Order ID: ${orderResult.order_id}` },
        headings: { en: "Subscription Order Confirmed!" },
      }),
      sendPushNotification({
        appId: process.env.ONESIGNAL_STORE_APP_ID,
        apiKey: process.env.ONESIGNAL_STORE_API_KEY,
        playerIds: [storeData.one_subscription],
        data: { store_id: storeData.id, type: "new subscription order received" },
        contents: { en: `New subscription order received! Order ID: ${orderResult.order_id}` },
        headings: { en: "New Subscription Order Alert" },
      }),
      sendInAppNotification({
        uid,
        title: "Subscription Order Confirmed",
        description: `Your subscription order created. Order ID: ${orderResult.order_id}.`,
      }),
      sendInAppNotification({
        uid: storeData.id,
        title: "New Subscription Order Received",
        description: `A new subscription order has been placed. Order ID: ${orderResult.order_id}.`,
      }),
    ]);
  } catch (notificationError) {
    console.error("Notification error:", notificationError);
  }

  return res.status(200).json({
    ResponseCode: "200",
    Result: "true",
    ResponseMsg: "Subscription order created successfully!",
    order_id: orderResult.order_id,
    o_total: orderResult.o_total,
    is_coupon_applied: !!orderResult.cou_id,
    coupon_applied: orderResult.cou_id
      ? { id: orderResult.cou_id, title: orderResult.coupon?.coupon_title, amount: orderResult.cou_amt }
      : null,
    items: orderItemsResult.map(item => ({
      product_id: item.product_id,
      price: item.price,
      store_weight_id: item.store_weight_id,
      timeslot_id: item.timeslot_id,
      repeat_day: item.repeat_day,
      schedule: item.schedule,
    })),
  });
};


const editSubscribeOrder = async (req, res) => {
  const { order_id, products, address_id, a_note, tax, o_total, subtotal, diffAmount, diffType } = req.body;
  const uid = req.user.userId;

  if (!order_id || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Missing required fields!",
    });
  }

  const t = await sequelize.transaction();
  try {
    const order = await SubscribeOrder.findOne({ where: { id: order_id, uid }, transaction: t });
    if (!order) throw new Error("Order not found");

    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    const updatedItems = await Promise.all(
      products.map(async (item) => {
        if (
          !item.product_id || !item.weight_id || !item.quantities || !item.timeslot_id || !item.start_date ||
          !item.end_date ||
          typeof item.quantities !== "object" || Object.keys(item.quantities).length === 0
        ) {
          throw new Error("Invalid product data");
        }

        const startDate = new Date(item.start_date);
        const endDate = new Date(item.end_date);

        const weight = await WeightOption.findByPk(item.weight_id, { transaction: t });
        const days = Object.keys(item.quantities).filter(day => validDays.includes(day.toLowerCase()) && item.quantities[day] > 0);
        const deliveryDays = calculateDeliveryDays2(startDate, endDate, days);
        const totalUnits = Object.values(item.quantities).reduce((sum, qty) => sum + qty * deliveryDays, 0);


        return {
          product_id: item.product_id,
          weight_id: item.weight_id,
          timeslot_id: item.timeslot_id,
          schedule: validDays.reduce((acc, day) => ({ ...acc, [day]: item.quantities[day] || 0 }), {}),
          repeat_day: days,
          deliveryDays,
          start_date: startDate,
          end_date: endDate,
        };
      })
    );



    const user = await User.findByPk(uid, { transaction: t });
    // Wallet handling
    if (diffType === "debit") {
      if (user.wallet < diffAmount) {
        throw new Error(`Insufficient wallet balance. Add ₹${(diffAmount).toFixed(2)}`);
      }
      await user.update({ wallet: user.wallet - diffAmount }, { transaction: t });
      await WalletReport.create({
        uid,
        amt: diffAmount,
        message: `Order updated. ₹${diffAmount} debited.`,
        transaction_no: order.order_id,
        tdate: new Date(),
        transaction_type: "Debited",
        status: 1,
      }, { transaction: t });
    } else if (diffType === "credit") {
      const refund = Math.abs(diffAmount);
      await user.update({ wallet: user.wallet + refund }, { transaction: t });
      await WalletReport.create({
        uid,
        amt: refund,
        message: `Order updated. ₹${refund} refunded.`,
        transaction_no: order.order_id,
        tdate: new Date(),
        transaction_type: "Credited",
        status: 1,
      }, { transaction: t });
    }

    // Update main order
    await order.update({
      address_id: order.o_type === "Delivery" ? address_id : null,
      o_total: o_total,
      subtotal,
      tax,
      a_note,
    }, { transaction: t });

    // Update or create SubscribeOrderProduct entries
    const existingProducts = await SubscribeOrderProduct.findAll({
      where: { oid: order.id },
      transaction: t,
    });

    const updatedKeys = updatedItems.map(i =>
      `${i.product_id}-${i.weight_id}-${i.timeslot_id}`
    );

    for (const item of updatedItems) {
      const existing = existingProducts.find(
        (prod) =>
          prod.product_id === item.product_id &&
          prod.weight_id === item.weight_id &&
          prod.timeslot_id === item.timeslot_id
      );

      if (existing) {
        await existing.update({
          schedule: item.schedule,
          repeat_day: item.repeat_day,
          start_date: item.start_date,
          end_date: item.end_date,
          status: "Pending",
          price: item.price,
        }, { transaction: t });
      }
    }

    // Mark products not present in new list as removed (optional)
    for (const existing of existingProducts) {
      const key = `${existing.product_id}-${existing.weight_id}-${existing.timeslot_id}`;
      if (!updatedKeys.includes(key)) {
        await existing.update({ status: "Removed" }, { transaction: t });
      }
    }

    await t.commit();
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Subscription order updated successfully!",
      order_id: order.order_id,
    });
  } catch (error) {
    await t.rollback();
    console.error("Edit error:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: error.message || "Server Error",
    });
  }
};

const pauseSubscriptionOrder = async (req, res) => {
  const uid = req.user.userId;
  const { orderId, subscribeOrderProductId, start_date, end_date } = req.body;
  console.log("pauseSubscriptionOrder called with data:", req.body);
  if (!uid) {
    return res.status(401).json({ ResponseCode: "401", Result: "false", ResponseMsg: "Unauthorized" });
  }

  if (!orderId || !subscribeOrderProductId || !start_date || !end_date) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Missing required fields!",
    });
  }

  const t = await sequelize.transaction();
  try {
    const activeOrder = await SubscribeOrder.findOne({
      where: { id: orderId, uid },
      transaction: t,
    });

    if (!activeOrder) throw new Error("Active order not found or not owned by user");

    const store = await Store.findByPk(activeOrder.store_id, { transaction: t });
    if (!store) throw new Error("Store not found");

    const subscribeOrderProduct = await SubscribeOrderProduct.findOne({
      where: { id: subscribeOrderProductId, status: "Active" },
      transaction: t,
    });
    if (!subscribeOrderProduct) throw new Error("Subscribe order product not found");

    const pauseStart = new Date(start_date);
    const pauseEnd = new Date(end_date);
    const orderStart = new Date(subscribeOrderProduct.start_date);
    const orderEnd = new Date(subscribeOrderProduct.end_date);

    console.log(pauseStart, " pauseStart")
    console.log(pauseEnd, "pauseEnd")
    console.log(orderStart, "orderStart")
    console.log(orderEnd, "orderEnd")
    if (isNaN(pauseStart) || isNaN(pauseEnd) || pauseStart > pauseEnd || pauseStart < orderStart || pauseEnd > orderEnd) {
      throw new Error("Pause period must be within order period and valid");
    }

    await subscribeOrderProduct.update(
      {
        pause: true,
        status: "Paused",
        start_period: new Date(start_date),
        paused_period: new Date(end_date),
      },
      { transaction: t }
    );
    await pauseHistory.create({
      user_id: uid,
      subscribe_order_product_id: subscribeOrderProductId,
      pause_start_date: new Date(start_date),
      pause_end_date: new Date(end_date),
    }, { transaction: t })

    //// Check if all other products in this order are also paused
    const allProducts = await SubscribeOrderProduct.findAll({
      where: { oid: orderId },
      transaction: t
    })
    const allPaused = allProducts.length > 0 && allProducts.every(p => p.status === "Paused")
    if (allPaused) {
      await SubscribeOrder.update({ status: "Paused" }, { transaction: t })
    }
    const user = await User.findByPk(uid, { transaction: t });

    // Send notifications after commit
    try {
      await Promise.allSettled([
        sendPushNotification({
          appId: process.env.ONESIGNAL_CUSTOMER_APP_ID,
          apiKey: process.env.ONESIGNAL_CUSTOMER_API_KEY,
          playerIds: [user.one_subscription],
          data: { user_id: user.id, type: "Subscription order paused" },
          contents: { en: `${user.name}, your order has been paused from ${start_date} to ${end_date}`, },
          headings: { en: "Subscription Order Paused!" },
        }),
        sendPushNotification({
          appId: process.env.ONESIGNAL_STORE_APP_ID,
          apiKey: process.env.ONESIGNAL_STORE_API_KEY,
          playerIds: [storeData.one_subscription],
          data: { store_id: store.id, type: "subscription order paused" },
          contents: { en: `Subscription order paused! Order ID: ${activeOrder.order_id}`, },
          headings: { en: "Subscription Order Paused!" },
        }),
        sendInAppNotification({
          uid,
          title: "Subscription Order Paused!",
          description: `Your subscription order has been paused from ${start_date} to ${end_date}.`,
        }),
        sendInAppNotification({
          uid: store.id,
          title: "Subscription Order Paused!",
          description: `Subscription order paused! Order ID: ${activeOrder.order_id}`,
        }),
      ]);
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    await t.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: `Subscription order paused successfully from ${start_date} to ${end_date}!`,

    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error pausing subscription order:", error.message);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};


const resumeSubscriptionOrder = async (req, res) => {
  const uid = req.user.userId;
  const { orderId, subscribeOrderProductId } = req.body;

  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized",
    });
  }

  if (!orderId || !subscribeOrderProductId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Order ID and Subscribe Order Product ID are required",
    });
  }

  const t = await sequelize.transaction();

  try {
    // Fetch paused subscription product
    const pausedOrder = await SubscribeOrderProduct.findOne({
      where: { id: subscribeOrderProductId, oid: orderId },
      include: {
        model: Product,
        as: "productDetails",
        attributes: ["title"],
      },
      transaction: t,
    });

    if (
      !pausedOrder ||
      pausedOrder.pause !== true ||
      !pausedOrder.start_period ||
      !pausedOrder.paused_period
    ) {
      await t.rollback();
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Paused product not found or not paused",
      });
    }

    // Fetch the order, store, and user for validations
    const order = await SubscribeOrder.findByPk(orderId, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order not found",
      });
    }

    const store = await Store.findByPk(order.store_id, { transaction: t });
    if (!store) {
      await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Store not found",
      });
    }

    const user = await User.findByPk(uid, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User not found",
      });
    }

    // Dates for pause calculation
    const resumeDate = new Date();
    const pauseStart = new Date(pausedOrder.start_period);
    const plannedPauseEnd = new Date(pausedOrder.paused_period);

    if (isNaN(pauseStart) || isNaN(plannedPauseEnd)) {
      throw new Error("Invalid pause start or pause end dates");
    }

    // Effective pause end is the earlier of resumeDate or plannedPauseEnd
    const effectivePauseEnd = resumeDate < plannedPauseEnd ? resumeDate : plannedPauseEnd;

    let actualPausedDays = 0;
    if (pauseStart <= effectivePauseEnd) {
      actualPausedDays =
        Math.ceil((effectivePauseEnd - pauseStart) / (1000 * 60 * 60 * 24)) + 1; // inclusive of both days
    }

    if (actualPausedDays < 0) actualPausedDays = 0;

    // Use pausedOrder's subscription product start and end dates for calculation
    const orderStart = pausedOrder.start_date ? new Date(pausedOrder.start_date) : null;
    const orderEnd = pausedOrder.end_date ? new Date(pausedOrder.end_date) : null;

    if (!orderStart || isNaN(orderStart) || !orderEnd || isNaN(orderEnd)) {
      throw new Error("Invalid subscription product start or end dates");
    }

    const totalDays = Math.ceil((orderEnd - orderStart) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
      throw new Error("Subscription product has invalid total days");
    }

    // Calculate refund based on paused days
    const perDayCost = pausedOrder.price / totalDays;
    const refundAmount = parseFloat((perDayCost * actualPausedDays).toFixed(2));

    // Update subscription product: unpause and reset periods
    await pausedOrder.update(
      {
        pause: false,
        status: "Active",
        paused_period: null, // clear paused period
        start_period: resumeDate, // reset start_period to resume date
      },
      { transaction: t }
    );

    // Credit refund to user's wallet
    await user.update({ wallet: user.wallet + refundAmount }, { transaction: t });

    // Create wallet report entry for refund
    await WalletReport.create(
      {
        uid: user.id,
        amt: refundAmount,
        message: `Refund for resumed subscription order ${order.order_id} after ${actualPausedDays} paused days.`,
        transaction_no: order.order_id,
        tdate: new Date(),
        transaction_type: "Credited",
        status: 1,
      },
      { transaction: t }
    );

    // Update order status to Active
    await order.update({ status: "Active" }, { transaction: t });

    await t.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: `Subscription order resumed successfully! ₹${refundAmount} credited for ${actualPausedDays} paused days.`,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error resuming subscription order:", error.message);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};



const autoResumeSubscriptionOrder = async () => {
  console.log("\n[Job Start] Running auto-resume job for paused subscription orders...");

  const currentDate = new Date();
  console.log("Current Date:", currentDate.toISOString());

  const t = await sequelize.transaction(); // Simple transaction

  try {
    const pausedOrders = await SubscribeOrderProduct.findAll({
      where: {
        pause: true,
        status: 'Paused',
      },
      include: [
        {
          model: SubscribeOrder,
          as: 'subscriberid',
          attributes: ['uid'],
        },
      ],
      transaction: t,
    });

    console.log(`Found ${pausedOrders.length} paused orders.`);

    if (pausedOrders.length === 0) {
      console.log("No paused orders to process.");
      await t.commit();
      return;
    }

    for (const order of pausedOrders) {
      console.log(`\nProcessing order ID: ${order.id}`);

      // Validate pause dates
      if (!order.start_period || !order.paused_period) {
        console.log("Missing pause dates, skipping.");
        continue;
      }

      // Validate subscriberid association
      if (!order.subscriberid || !order.subscriberid.uid) {
        console.log("Missing subscriberid or uid, skipping.");
        continue;
      }

      const pauseStart = new Date(order.start_period);
      const pauseEnd = new Date(order.paused_period);
      const orderStart = new Date(order.start_date);
      const orderEnd = order.end_date ? new Date(order.end_date) : new Date();

      console.log("Pause Start:", pauseStart.toISOString());
      console.log("Pause End:", pauseEnd.toISOString());
      console.log("Subscription Start:", orderStart.toISOString());
      console.log("Subscription End:", orderEnd.toISOString());

      // Validate dates
      if (isNaN(pauseStart) || isNaN(pauseEnd) || isNaN(orderStart) || isNaN(orderEnd)) {
        console.log("Invalid subscription or pause dates, skipping.");
        continue;
      }

      // Check if pause period is over
      if (currentDate < pauseEnd) {
        console.log(`Skipping - pause still in effect until ${pauseEnd.toISOString()}`);
        continue;
      }

      // Calculate paused days (inclusive of start and end)
      const pausedDays = Math.ceil(
        (pauseEnd.getTime() - pauseStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      console.log("Paused Days:", pausedDays);

      if (pausedDays <= 0) {
        console.log("Invalid paused days, skipping.");
        continue;
      }

      // Calculate refund based on paused days
      let refundAmount = 0;
      if (order.price > 0) {
        const subscriptionDays = Math.ceil(
          (orderEnd.getTime() - orderStart.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        if (subscriptionDays <= 0) {
          console.log("Invalid subscription duration, skipping refund.");
        } else {
          const perDayCost = order.price / subscriptionDays;
          refundAmount = parseFloat((perDayCost * pausedDays).toFixed(2));
          console.log("Subscription Days:", subscriptionDays);
          console.log("Per Day Cost:", perDayCost.toFixed(2));
          console.log("Refund Amount:", refundAmount);
        }
      } else {
        console.log("Invalid price, skipping refund.");
      }

      // Fetch user and store
      const user = await User.findByPk(order.subscriberid.uid, { transaction: t });
      const store = await Store.findByPk(order.store_id, { transaction: t });

      // Process refund if user exists and refund is applicable
      let refundProcessed = false;
      if (user && refundAmount > 0) {
        console.log(`Crediting ₹${refundAmount} to user wallet (UID: ${order.subscriberid.uid}).`);

        try {
          await user.update(
            { wallet: user.wallet + refundAmount },
            { transaction: t, logging: console.log }
          );

          await WalletReport.create(
            {
              uid: order.subscriberid.uid,
              amt: refundAmount,
              message: `Refund for paused subscription order ${order.order_id} for ${pausedDays} days.`,
              transaction_no: order.id,
              tdate: new Date(),
              transaction_type: "Credited",
              status: 1,
            },
            { transaction: t, logging: console.log }
          );

          console.log("Refund processed and wallet updated.");
          refundProcessed = true;
        } catch (refundError) {
          console.error(`Failed to process refund for order ID ${order.id}:`, refundError.message, refundError.stack);
          // Continue to resume subscription
        }
      } else {
        console.log("User not found or no refund required, proceeding to resume order.");
      }

      // Resume the subscription in a new transaction if refund fails
      let updateTransaction = t;
      if (!refundProcessed && t.finished) {
        console.log("Main transaction rolled back, creating new transaction for update.");
        updateTransaction = await sequelize.transaction(); // Simple transaction
      }

      try {
        const [updatedRows] = await SubscribeOrderProduct.update(
          {
            pause: false,
            status: "Active",
            paused_period: null,
            start_period: null,
          },
          {
            where: { id: order.id },
            transaction: updateTransaction,
            logging: console.log,
          }
        );

        if (updatedRows === 0) {
          console.log("Failed to update order status: No rows affected.");
          continue;
        }

        console.log("Order status updated to Active.");
      } catch (updateError) {
        console.error(`Failed to update order ID ${order.id}:`, updateError.message, updateError.stack);
        throw updateError;
      } finally {
        if (updateTransaction !== t && updateTransaction && !updateTransaction.finished) {
          await updateTransaction.commit();
        }
      }
    }

    if (!t.finished) {
      await t.commit();
    }
    console.log("[Job Complete] Auto-resume job completed successfully.\n");
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error("Error in auto-resume job:", error.message, error.stack);
    throw error; // Rethrow for job scheduler to handle
  }
};

const calculateDeliveryDays = (startDate, endDate, days) => {
  if (!days || !Array.isArray(days) || days.length === 0) {
    console.log("Invalid or empty repeat_day, returning 0 delivery days.");
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (isNaN(start) || isNaN(end) || end < start) {
    console.log("Invalid start or end date, returning 0 delivery days.");
    return 0;
  }

  // Normalize days to lowercase strings
  const validDays = days.map((d) => {
    if (typeof d === "number") {
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      return dayNames[d] ? dayNames[d].toLowerCase() : null;
    }
    return typeof d === "string" ? d.toLowerCase() : null;
  }).filter((d) => d && typeof d === "string");

  if (validDays.length === 0) {
    console.log("No valid days after normalization, returning 0 delivery days.");
    return 0;
  }

  let deliveryDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    const dayName = currentDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    if (validDays.includes(dayName)) {
      deliveryDays++;
    }
  }

  return deliveryDays;
};




const getRandomMinute = () => Math.floor(Math.random() * 301); //0 to 300 minutes
const scheduleDailyRandom = () => {
  const randomMinute = getRandomMinute();
  const hour = Math.floor(randomMinute / 60);
  const minute = randomMinute % 60;

  // random time
  const cronExpression = `${minute} ${hour} * * *`;// e.g., "23 1 * * *" for 1:23 AM
  console.log(`Scheduling auto-resume job for ${hour}:${minute.toString().padStart(2, '0')} AM`);

  cron.schedule(cronExpression, async () => {
    console.log(`Running auto-resume job at ${new Date().toISOString()}`);
    await autoResumeSubscriptionOrder();
    // Reschedule for the next day at a new random time
    scheduleDailyRandom();
  }, {
    timezone: "Asia/Kolkata"
  })

}
// Start the scheduling
scheduleDailyRandom();

// Schedule daily at midnight
// cron.schedule("*/1 * * * *", autoResumeSubscriptionOrder);
// cron.schedule("0 0 * * *", autoResumeSubscriptionOrder);
// setInterval(autoResumeSubscriptionOrder, 20 * 1000); // every 20 seconds



const getOrdersByStatus = async (req, res) => {
  const uid = req.user.userId;

  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized",
    });
  }

  try {
    const orders = await SubscribeOrder.findAll({
      where: { uid },
      include: [
        {
          model: SubscribeOrderProduct,
          as: "orderProducts",
          include: [
            {
              model: StoreWeightOption,
              as: 'soptions',
              attributes: [
                'id',
                'product_inventory_id',
                'product_id',
                'weight_id',
                'quantity',
                'subscription_quantity',
                'total',
              ],
              include: [
                {
                  model: WeightOption,
                  as: "weightOption",
                  attributes: [
                    'id',
                    'product_id',
                    'weight',
                    'subscribe_price',
                    'normal_price',
                    'mrp_price',
                  ],
                  include: [
                    {
                      model: Product,
                      as: "product",
                      attributes: ['id', 'title', 'img', 'discount', 'description'],
                    },
                  ],
                },
              ],
            },
            {
              model: Product,
              as: "subscribeProduct",
              attributes: ["id", "title", "img", "description"],
              include: [
                {
                  model: ProductReview,
                  as: "ProductReviews",
                  attributes: ["id", "rating", "review", "user_id", "order_id"],
                  where: {
                    user_id: uid,
                  },
                  required: false,
                },
              ],
            },
            {
              model: Time,
              as: "timeslotss",
              attributes: ['id', 'mintime', 'maxtime'],
            },
          ],
        },
        {
          model: Address,
          as: "subOrdAddress",
        },
        {
          model: Review,
          as: "suborderdeliveryreview",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const statusPriority = ["Active", "Processing", "Paused", "Pending", "Completed", "Cancelled"];

    for (let order of orders) {
      // Calculate average rating
      const allReviews = order.orderProducts.flatMap(orderProduct =>
        orderProduct.subscribeProduct?.ProductReviews?.filter(r => r.order_id === order.id) || []
      );

      const totalRating = allReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

      order.setDataValue('averageRating', averageRating);

      const productStatuses = (order.orderProducts || []).map(p => p.status || "");
      let groupStatus = "Pending";

      if (productStatuses.length > 0) {
        for (const status of statusPriority) {
          if (productStatuses.includes(status)) {
            groupStatus = status;
            break;
          }
        }
      }

      order.setDataValue("group_status", groupStatus);
      order.status = groupStatus;
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Subscribe Orders fetched successfully!",
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error.stack);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};





const getOrderDetails = async (req, res) => {
  const uid = req.user.userId;

  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized",
    });
  }

  const { id } = req.params;

  try {
    const orderDetails = await SubscribeOrder.findOne({
      where: { id, uid },
      include: [
        {
          model: SubscribeOrderProduct,
          as: "orderProducts",
          include: [
            {
              model: StoreWeightOption,
              as: "soptions",
              attributes: [
                "id",
                "product_inventory_id",
                "product_id",
                "weight_id",
                "quantity",
                "subscription_quantity",
                "total",
              ],
              include: [
                {
                  model: WeightOption,
                  as: "weightOption",
                  attributes: [
                    "id",
                    "product_id",
                    "weight",
                    "subscribe_price",
                    "normal_price",
                    "mrp_price",
                  ],
                  include: [
                    {
                      model: Product,
                      as: "product",
                      attributes: ["id", "title", "img", "discount", "description"],
                    },
                  ],
                },
              ],
            },
            {
              model: Product,
              as: "subscribeProduct",
              attributes: ["id", "title", "img", "description"],
              include: [
                {
                  model: ProductReview,
                  as: "ProductReviews",
                  attributes: ["id", "rating", "review", "user_id", "order_id"],
                  where: {
                    user_id: uid, // Only filter by user_id
                    order_id: id, // Ensure we only get reviews for this specific order
                  },
                  required: false,
                },
              ],
            },
            {
              model: Time,
              as: "timeslotss",
              attributes: ["id", "mintime", "maxtime"],
            },
          ],
        },
        {
          model: Address,
          as: "subOrdAddress",
        },
        {
          model: Review,
          as: "suborderdeliveryreview",
        },
      ],
    });

    if (!orderDetails) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order Not Found",
      });
    }

    // Calculate average rating only for this order
    const allReviews = orderDetails.orderProducts.flatMap(orderProduct => {
      const reviews = orderProduct.subscribeProduct?.ProductReviews || [];
      return reviews.filter(r => r.order_id === orderDetails.id);
    });

    const totalRating = allReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Subscribe Order fetched successfully!",
      orderDetails: orderDetails.toJSON(),
      averageRating,
    });
  } catch (error) {
    console.error("Error fetching order:", error.stack);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: error.message,
    });
  }
};



// this cancelled for particular order
const cancelOrder = async (req, res) => {
  const { subscribeOrderProductId, orderId } = req.body;
  const uid = req.user.userId;

  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized",
    });
  }

  if (!subscribeOrderProductId || !orderId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "subscribeOrderProductId and orderId are required!",
    });
  }

  const t = await sequelize.transaction();
  try {
    const orderProduct = await SubscribeOrderProduct.findOne({
      where: { id: subscribeOrderProductId },
      include: [{ model: SubscribeOrder, as: "subscriberid", where: { uid } }],
      transaction: t,
    });

    if (!orderProduct || !orderProduct.oid) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Product not found or not owned by user!",
      });
    }
    console.log(orderProduct, "ooooooooooooooooooo")
    const order = orderProduct.subscriberid;
    const user = await User.findByPk(uid, { transaction: t });
    const store = await Store.findByPk(order.store_id, { transaction: t });

    if (!user || !store) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "User or Store not found!",
      });
    }

    const setting = await Setting.findOne({ transaction: t });
    if (!setting) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Setting not found!",
      });
    }

    const deliveryCharge = parseFloat(setting.delivery_charges) || 0;
    const storeCharge = parseFloat(setting.store_charges) || 0;
    const tax = parseFloat(setting.tax) || 0;

    const startDate = new Date(orderProduct.start_date);
    const endDate = orderProduct.end_date ? new Date(orderProduct.end_date) : null;
    const currentDate = new Date();
    currentDate.setHours(23, 59, 59, 999);

    const totalDeliveryDays = calculateDeliveryDays2(startDate, endDate, orderProduct.repeat_day || [], orderProduct.paused_periods || []);
    const completedDeliveryDays = calculateDeliveryDays2(
      startDate,
      currentDate < endDate ? currentDate : endDate,
      orderProduct.repeat_day || [],
      orderProduct.paused_periods || []
    );
    const remainingDeliveryDays = totalDeliveryDays - completedDeliveryDays;

    if (totalDeliveryDays === 0) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No delivery days in product schedule!",
      });
    }

    const productPrice = parseFloat(orderProduct.price);
    const perDayCost = productPrice / totalDeliveryDays;
    const refundAmount = parseFloat((perDayCost * remainingDeliveryDays).toFixed(2));

    if (refundAmount < 0) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Calculated refund amount cannot be negative!",
      });
    }

    // Cancel this product
    await orderProduct.update({ status: "Cancelled" }, { transaction: t });

    // Check if other products in the same order are still active
    const remainingProducts = await SubscribeOrderProduct.findAll({
      where: { oid: order.id, status: { [Op.ne]: "Cancelled" } },
      transaction: t,
    });

    // Adjust order totals
    let updatedSubtotal = parseFloat(order.subtotal) - productPrice;
    let updatedTotal = parseFloat(
      (
        updatedSubtotal +
        (order.o_type === "Delivery" ? deliveryCharge : 0) +
        storeCharge +
        tax -
        (order.cou_amt || 0)
      ).toFixed(2)
    );

    // Update order status based on remaining products
    let newStatus = "Cancelled";
    if (remainingProducts.length > 0) {
      newStatus = "Active";
    } else {
      updatedSubtotal = 0;
      updatedTotal = 0;
    }

    await order.update(
      {
        subtotal: updatedSubtotal,
        o_total: updatedTotal,
        status: newStatus,
      },
      { transaction: t }
    );

    const allProducts = await SubscribeOrderProduct.findAll({
      where: { oid: order.id },
      transaction: t,
    });

    const allCancelled = allProducts.length > 0 && allProducts.every(p => p.status === "Cancelled");

    if (allCancelled) {
      await order.update({ status: "Cancelled" }, { transaction: t });
    }

    // Refund processing
    if (refundAmount > 0) {
      const updatedWallet = parseFloat(user.wallet) + refundAmount;
      await user.update({ wallet: updatedWallet }, { transaction: t });

      await WalletReport.create(
        {
          uid,
          amt: refundAmount,
          message: `Refund for cancelling product ${subscribeOrderProductId} in order ${order.order_id}: ₹${refundAmount.toFixed(2)} for ${remainingDeliveryDays} days.`,
          transaction_no: order.order_id,
          tdate: new Date(),
          transaction_type: "Credited",
          status: 1,
        },
        { transaction: t }
      );
    }

    // Notifications
    try {
      await Promise.allSettled([
        sendPushNotification({
          appId: process.env.ONESIGNAL_CUSTOMER_APP_ID,
          apiKey: process.env.ONESIGNAL_CUSTOMER_API_KEY,
          playerIds: [user.one_subscription],
          data: { user_id: user.id, type: "Subscription product cancelled" },
          contents: {
            en: `${user.name}, Product ${subscribeOrderProductId} in your subscription order (ID: ${order.order_id}) has been cancelled!`,
          },
          headings: { en: "Subscription Product Cancelled!" },
        }),
        sendPushNotification({
          appId: process.env.ONESIGNAL_STORE_APP_ID,
          apiKey: process.env.ONESIGNAL_STORE_API_KEY,
          playerIds: [store.one_subscription],
          data: { store_id: store.id, type: "subscription product cancelled" },
          contents: {
            en: `Product ${subscribeOrderProductId} in subscription order (ID: ${order.order_id}) has been cancelled!`,
          },
          headings: { en: "Subscription Product Cancelled" },
        }),
        sendInAppNotification({
          uid,
          title: "Subscription Product Cancelled",
          description: `Product ${subscribeOrderProductId} in your subscription order (ID: ${order.order_id}) has been cancelled. Refund: ₹${refundAmount.toFixed(2)}.`,
        }),
        sendInAppNotification({
          uid: store.id,
          title: "Subscription Product Cancelled",
          description: `Product ${subscribeOrderProductId} in subscription order (ID: ${order.order_id}) has been cancelled.`,
        }),
      ]);
    } catch (notificationError) {
      console.error("Notification error:", notificationError.message);
    }

    await t.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Product cancelled successfully!",
      order_id: order.order_id,
      refund_amount: refundAmount,
      wallet_transaction_type: refundAmount > 0 ? "Credited" : "No Change",
      order_status: newStatus,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error cancelling subscription product:", {
      message: error.message,
      stack: error.stack,
      subscribeOrderProductId,
    });
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};

// this cancell all the products in the subscription order
const cancelAllProductsInSubscriptionOrder = async (req, res) => {
  const { orderId } = req.body;
  const uid = req.user.userId;

  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized",
    });
  }

  if (!orderId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Order ID is required!",
    });
  }

  const t = await sequelize.transaction();
  try {
    const order = await SubscribeOrder.findOne({
      where: { id: orderId, uid, status: "Pending" },
      include: [{
        model: SubscribeOrderProduct,
        as: "orderProducts",
        where: { status: "Pending" }
      }],
      transaction: t,
    });

    if (!order || !order.orderProducts || order.orderProducts.length === 0) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Order not found or no pending products to cancel.",
      });
    }

    const user = await User.findByPk(uid, { transaction: t });
    const store = await Store.findByPk(order.store_id, { transaction: t });
    const setting = await Setting.findOne({ transaction: t });

    if (!user || !store || !setting) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Required data not found (user, store, or settings).",
      });
    }

    const deliveryCharge = parseFloat(setting.delivery_charges) || 0;
    const storeCharge = parseFloat(setting.store_charges) || 0;
    const tax = parseFloat(setting.tax) || 0;

    const totalProductPrice = order.orderProducts.reduce((sum, p) => sum + parseFloat(p.price || 0), 0);
    const totalRefund = totalProductPrice + deliveryCharge + storeCharge + tax;

    // Update all SubscribeOrderProduct to Cancelled
    for (const product of order.orderProducts) {
      await product.update({ status: "Cancelled" }, { transaction: t });
    }

    // Update SubscribeOrder to Cancelled
    await order.update({ status: "Cancelled", subtotal: 0, o_total: 0 }, { transaction: t });

    // Update user wallet
    const updatedWallet = parseFloat(user.wallet || 0) + totalRefund;
    await user.update({ wallet: updatedWallet }, { transaction: t });

    // Create wallet transaction report
    await WalletReport.create({
      uid,
      amt: totalRefund,
      message: `Full refund for cancelling subscription order ${order.order_id}`,
      transaction_no: order.order_id,
      tdate: new Date(),
      transaction_type: "Credited",
      status: 1,
    }, { transaction: t });

    await t.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "All subscription products cancelled and refund processed successfully.",
      refund_amount: totalRefund.toFixed(2),
    });

  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error cancelling all subscription products:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};


module.exports = {
  subscribeOrder,
  editSubscribeOrder,
  getOrdersByStatus,
  getOrderDetails,
  cancelOrder,
  pauseSubscriptionOrder,
  resumeSubscriptionOrder,
  // autoResumeSubscriptionOrder,
  cancelAllProductsInSubscriptionOrder
};


