const { Sequelize, Op } = require("sequelize");
const SubscribeOrder = require("../../Models/SubscribeOrder");
const Product = require("../../Models/Product");
const SubscribeOrderProduct = require("../../Models/SubscribeOrderProduct");
const pauseHistory=require("../../Models/PauseHistory")
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
const { calculateDeliveryDays, generateOrderId } = require("../helper/orderUtils");


const MAX_RETRIES = 3;

const subscribeOrder = async (req, res) => {
  const {
    coupon_id,
    products,
    start_date,
    end_date,
    o_type,
    store_id,
    address_id,
    a_note,
    tax,
    delivery_fee,
    subtotal,
    o_total,
  } = req.body;

  const uid = req.user.userId;

  // Basic validations
  if (!uid || !Array.isArray(products) || products.length === 0 || !start_date || !o_type || !store_id || !subtotal || !o_total) {
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

  // Validate product structure and quantities
  const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const item of products) {
    if (
      !item.product_id ||
      !item.weight_id ||
      !item.quantities ||
      typeof item.quantities !== "object" ||
      !item.timeslot_id ||
      Object.keys(item.quantities).length === 0 ||
      !Object.keys(item.quantities).every(day => validDays.includes(day.toLowerCase())) ||
      !Object.values(item.quantities).every(qty => typeof qty === "number" && qty >= 0)
    ) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid product structure or values in quantities.",
      });
    }
  }

  // Fetch settings
  const setting = await Setting.findOne();
  if (!setting) {
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Settings not found!",
    });
  }

  const minimumSubscriptionDays = parseInt(setting.minimum_subscription_days, 10) || 30;
  const deliveryCharge = parseFloat(setting.delivery_charges) || 0;
  const storeCharge = parseFloat(setting.store_charges) || 0;
  const settingTax = parseFloat(setting.tax) || 0;

  // Validate tax and delivery fee
  if (tax !== settingTax || (o_type === "Delivery" && delivery_fee !== deliveryCharge)) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Tax or delivery fee mismatch with settings!",
    });
  }

  // Validate dates
  const startDate = new Date(start_date);
  if (isNaN(startDate)) {
    return res.status(400).json({ ResponseCode: "400", Result: "false", ResponseMsg: "Invalid start_date format!" });
  }

  const endDate = end_date ? new Date(end_date) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year if not provided
  if (isNaN(endDate)) {
    return res.status(400).json({ ResponseCode: "400", Result: "false", ResponseMsg: "Invalid end_date format!" });
  }

  const minEndDate = new Date(startDate);
  minEndDate.setDate(startDate.getDate() + minimumSubscriptionDays - 1);
  if (endDate < minEndDate) {
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
      const user = await User.findOne({ where: { id: uid }, transaction: t, lock: t.LOCK.UPDATE });
      if (!user) throw new Error("User not found");

      const store = await Store.findOne({ where: { id: store_id }, transaction: t });
      if (!store) throw new Error("Store not found");

      if (o_type === "Delivery") {
        const address = await Address.findOne({ where: { id: address_id }, transaction: t });
        if (!address) throw new Error("Address not found");
      }

      // Validate products and calculate subtotal
      const calculatedSubtotalDetails = await Promise.all(
        products.map(async item => {
          const product = await Product.findOne({
            where: { id: item.product_id },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          const weight = await WeightOption.findByPk(item.weight_id, { transaction: t });
          const timeslot = await Time.findByPk(item.timeslot_id, { transaction: t });

          if (!product) throw new Error(`Product not found: ${item.product_id}`);
          if (!weight) throw new Error(`Weight option not found: ${item.weight_id}`);
          if (!timeslot) throw new Error(`Timeslot not found: ${item.timeslot_id}`);
          if (product.quantity <= 0) throw new Error(`Product out of stock: ${item.product_id}`);
          if (product.subscription_required !== 1) throw new Error(`Subscription not allowed for product: ${item.product_id}`);

          const days = Object.keys(item.quantities).filter(day => validDays.includes(day.toLowerCase()) && item.quantities[day] > 0);
          const deliveryDays = calculateDeliveryDays(startDate, endDate, days);
          const totalUnits = Object.values(item.quantities).reduce((sum, qty) => sum + qty * deliveryDays, 0);

          if (product.quantity < totalUnits) {
            throw new Error(`Insufficient stock for product: ${item.product_id}. Available: ${product.quantity}, Requested: ${totalUnits}`);
          }

          const itemPrice = weight.subscribe_price * totalUnits;

          await product.update(
            {
              quantity: product.quantity - totalUnits,
              out_of_stock: product.quantity - totalUnits <= 0 ? 1 : 0,
            },
            { transaction: t }
          );

          return { item, price: itemPrice, subscribe_price: weight.subscribe_price, deliveryDays, days };
        })
      );

      const calculatedSubtotal = calculatedSubtotalDetails.reduce((sum, d) => sum + d.price, 0);
      if (Math.abs(calculatedSubtotal - parseFloat(subtotal)) > 0.01) {
        throw new Error("Provided subtotal does not match calculated subtotal");
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
          start_date,
          end_date: end_date || null,
          tax,
          d_charge: o_type === "Delivery" ? deliveryCharge : 0,
          store_charge: storeCharge,
          cou_id: appliedCoupon ? appliedCoupon.id : null,
          cou_amt: couponAmount,
          subtotal: parseFloat(subtotal),
          o_total: finalTotal,
          a_note,
          order_id: orderId,
          status: "Pending",
        },
        { transaction: t }
      );

      // Create order items
      const orderItems = await Promise.all(
        products.map(async item => {
          const weight = await WeightOption.findByPk(item.weight_id, { transaction: t });
          const days = Object.keys(item.quantities).filter(day => validDays.includes(day.toLowerCase()) && item.quantities[day] > 0);
          const deliveryDays = calculateDeliveryDays(startDate, endDate, days);
          const totalUnits = Object.values(item.quantities).reduce((sum, qty) => sum + qty * deliveryDays, 0);
          const itemPrice = weight.subscribe_price * totalUnits;

          const schedule = {};
          validDays.forEach(day => {
            schedule[day] = item.quantities[day.toLowerCase()] || 0;
          });

          return SubscribeOrderProduct.create(
            {
              oid: order.id,
              product_id: item.product_id,
              weight_id: item.weight_id,
              price: itemPrice,
              timeslot_id: item.timeslot_id,
              schedule,
              start_date,
              end_date: end_date || null,
              repeat_day: days,
              status: "Pending",
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
            weight_id: item.weight_id,
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
      weight_id: item.weight_id,
      timeslot_id: item.timeslot_id,
      repeat_day: item.repeat_day,
      schedule: item.schedule,
    })),
  });
};


const editSubscriptionOrder = async (req, res) => {
  const uid = req.user.userId;
  const { orderId, products } = req.body; // products: [{ product_id, weight_id, timeslot_id, days }]

  if (!uid || !orderId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "User ID and Order ID are required!",
    });
  }

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Products array is required to update timeslot or days!",
    });
  }

  const t = await sequelize.transaction();
  try {
    // Fetch the order
    const order = await SubscribeOrder.findOne({
      where: { id: orderId, uid, status: { [Op.in]: ["Pending", "Active", "Processing"] } },
      transaction: t,
    });

    if (!order) {
      await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Order not found, not owned by user, or not in editable status!",
      });
    }

    // Validate order dates
    if (!order.start_date) {
      await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Order start_date is invalid or missing!",
      });
    }

    // Fetch user and store
    const user = await User.findByPk(uid, { transaction: t });
    const store = await Store.findByPk(order.store_id, { transaction: t });
    if (!user || !store) {
      await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "User or store not found!",
      });
    }

    // Fetch settings
    const setting = await Setting.findOne({ transaction: t });
    if (!setting) {
      await t.rollback();
      return res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Settings not found!",
      });
    }

    const deliveryCharge = parseFloat(setting.delivery_charges) || 0;
    const storeCharge = parseFloat(setting.store_charges) || 0;
    const tax = parseFloat(setting.tax) || 0;

    // Initialize variables
    let updatedSubtotal = parseFloat(order.subtotal);
    let updatedTotal = parseFloat(order.o_total);
    let walletAdjustment = 0;
    let walletTransactionMessage = [];

    // Validate products
    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const item of products) {
      if (
        !item.product_id ||
        !item.weight_id ||
        !item.timeslot_id ||
        !item.days ||
        !Array.isArray(item.days) ||
        !item.days.every((day) => validDays.includes(day))
      ) {
        await t.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Each product must have valid product_id, weight_id, timeslot_id, and days array!",
        });
      }
    }

    // Fetch existing order products
    const existingOrderProducts = await SubscribeOrderProduct.findAll({
      where: { oid: orderId },
      transaction: t,
    });

    // Process each product update
    for (const item of products) {
      const existingProduct = existingOrderProducts.find(
        (p) => p.product_id === item.product_id && p.weight_id === item.weight_id
      );

      if (!existingProduct) {
        await t.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `Product ${item.product_id} with weight ${item.weight_id} not found in order!`,
        });
      }

      const product = await Product.findByPk(item.product_id, { transaction: t });
      const weight = await WeightOption.findByPk(item.weight_id, { transaction: t });
      const timeslot = await Time.findByPk(item.timeslot_id, { transaction: t });

      if (!product || !weight || !timeslot) {
        await t.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Product, weight option, or timeslot not found!",
        });
      }

      if (product.out_of_stock === 1) {
        await t.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `Product ${item.product_id} is out of stock!`,
        });
      }

      // Calculate delivery days
      const startDate = new Date(order.start_date);
      const endDate = order.end_date ? new Date(order.end_date) : null;
      const pausedPeriods = order.paused_periods || [];

      const originalDeliveryDays = calculateDeliveryDays(startDate, endDate, existingProduct.days, pausedPeriods);
      const newDeliveryDays = calculateDeliveryDays(startDate, endDate, item.days, pausedPeriods);

      if (newDeliveryDays === 0) {
        await t.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `No delivery days for product ${item.product_id} with new schedule!`,
        });
      }

      // Calculate cost adjustment
      const itemPrice = existingProduct.price;
      const perDayCost = itemPrice / originalDeliveryDays;
      const deliveryDaysAdjustment = perDayCost * (newDeliveryDays - originalDeliveryDays);

      walletAdjustment += deliveryDaysAdjustment;
      walletTransactionMessage.push(
        `Product ${item.product_id} (weight ${item.weight_id}): Delivery days changed from ${originalDeliveryDays} to ${newDeliveryDays} (${deliveryDaysAdjustment >= 0 ? "+" : "-"}₹${Math.abs(deliveryDaysAdjustment).toFixed(2)})`
      );

      // Update order product
      await existingProduct.update(
        {
          timeslot_id: item.timeslot_id,
          days: item.days,
        },
        { transaction: t }
      );
    }

    // Update order total
    updatedTotal = parseFloat(
      (updatedSubtotal + (order.o_type === "Delivery" ? deliveryCharge : 0) + storeCharge + tax - (order.cou_amt || 0)).toFixed(2)
    );

    // Wallet transaction
    const walletTransactionType = walletAdjustment > 0 ? "Debited" : walletAdjustment < 0 ? "Credited" : "No Change";

    if (walletAdjustment > 0) {
      const updatedWallet = user.wallet - walletAdjustment;
      if (updatedWallet < 0) {
        await t.rollback();
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `Insufficient wallet balance! Current: ₹${user.wallet.toFixed(2)}, Required: ₹${walletAdjustment.toFixed(2)}.`,
        });
      }
      await user.update({ wallet: updatedWallet }, { transaction: t });

      await WalletReport.create(
        {
          uid,
          amt: walletAdjustment,
          message: `Subscription order edited: ${walletTransactionMessage.join("; ")}.`,
          transaction_no: order.order_id,
          tdate: new Date(),
          transaction_type: "Debited",
          status: 1,
        },
        { transaction: t }
      );
    } else if (walletAdjustment < 0) {
      await user.update({ wallet: user.wallet + Math.abs(walletAdjustment) }, { transaction: t });

      await WalletReport.create(
        {
          uid,
          amt: Math.abs(walletAdjustment),
          message: `Refund for subscription order edit: ${walletTransactionMessage.join("; ")}.`,
          transaction_no: order.order_id,
          tdate: new Date(),
          transaction_type: "Credited",
          status: 1,
        },
        { transaction: t }
      );
    }

    // Update order
    await order.update(
      {
        o_total: updatedTotal,
      },
      { transaction: t }
    );

    // Send notifications

    await t.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Subscription order updated successfully!",
      order_id: order.order_id,
      o_total: updatedTotal,
      wallet_adjustment: walletAdjustment,
      wallet_transaction_type: walletTransactionType,
      updated_products: products,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error editing subscription order:", error.message);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
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

    const pausedPeriods = subscribeOrderProduct.paused_period || [];
    const overlap = pausedPeriods.some(
      (period) => new Date(period.start_date) <= pauseEnd && new Date(period.end_date) >= pauseStart
    );
    if (overlap) throw new Error("Pause period overlaps with existing paused periods");

    const orderProducts = await SubscribeOrderProduct.findAll({ where: { oid: orderId }, transaction: t });

    let refundAmount = 0;
    const pausedDays = Math.ceil((pauseEnd - pauseStart) / (1000 * 60 * 60 * 24)) + 1;

    for (const product of orderProducts) {
      const totalDeliveryDays = calculateDeliveryDays(orderStart, orderEnd, product.repeat_day, product.paused_period || []);
      if (totalDeliveryDays === 0) continue;

      const perDayCost = product.price / totalDeliveryDays;
      refundAmount += parseFloat((perDayCost * pausedDays).toFixed(2));
    }

    // const updatedPaused = [...pausedPeriods, { start_date, end_date }];

    await subscribeOrderProduct.update(
      {
        pause: true,
        status: "Paused",
        start_period:new Date(start_date),
        paused_period:new Date(end_date),
      },
      { transaction: t }
    );
    await pauseHistory.create({
      user_id:uid,
      subscribe_order_product_id: subscribeOrderProductId,
      pause_start_date: new Date(start_date),
      pause_end_date: new Date(end_date),
    },{transaction:t})

    const refundDate = new Date(pauseEnd);
    refundDate.setDate(refundDate.getDate() + 1);

    const currentDate = new Date();

    if (currentDate >= refundDate) {
      const user = await User.findByPk(uid, { transaction: t });
      await user.update({ wallet: user.wallet + refundAmount }, { transaction: t });

      await WalletReport.create(
        {
          uid,
          amt: refundAmount,
          message: `Refund for paused subscription order ${activeOrder.order_id} for ${pausedDays} days.`,
          transaction_no: activeOrder.order_id,
          tdate: new Date(),
          transaction_type: "Credited",
          status: 1,
        },
        { transaction: t }
      );

      // await Notification.create(
      //   {
      //     uid,
      //     datetime: new Date(),
      //     title: "Refund Credited",
      //     description: `₹${refundAmount} credited for paused order ${activeOrder.order_id}.`,
      //   },
      //   { transaction: t }
      // );


    }

    const user = await User.findByPk(uid, { transaction: t });

    // await Promise.all([
    //   sendNotification(user.one_subscription, process.env.ONESIGNAL_CUSTOMER_APP_ID, process.env.ONESIGNAL_CUSTOMER_API_KEY, {
    //     title: "Subscription Order Paused!",
    //     content: `${user.name}, your order has been paused from ${start_date} to ${end_date}`,
    //     data: { user_id: user.id, type: "Subscription order paused" },
    //   }),
    //   sendNotification(store.one_subscription, process.env.ONESIGNAL_STORE_APP_ID, process.env.ONESIGNAL_STORE_API_KEY, {
    //     title: "Subscription Order Paused",
    //     content: `Subscription order paused! Order ID: ${activeOrder.order_id}`,
    //     data: { store_id: store.id, type: "subscription order paused" },
    //   }),
    // ]);

    // await Promise.all([
    //   Notification.create(
    //     {
    //       uid,
    //       datetime: new Date(),
    //       title: "Subscription Order Paused",
    //       description: `Your subscription order has been paused from ${start_date} to ${end_date}.`,
    //     },
    //     { transaction: t }
    //   ),
    //   Notification.create(
    //     {
    //       uid: store.id,
    //       datetime: new Date(),
    //       title: "Subscription Order Paused",
    //       description: `Subscription order paused! Order ID: ${activeOrder.order_id}`,
    //     },
    //     { transaction: t }
    //   ),
    // ]);

    await t.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: `Subscription order paused successfully from ${start_date} to ${end_date}!`,
      refundAmount,
      refundDate: refundDate.toISOString().split("T")[0],
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
  console.log("resumeSubscriptionOrder called with data:", req.body);
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
    const pausedOrder = await SubscribeOrderProduct.findOne({
      where: { id: subscribeOrderProductId, oid: orderId },
      include:{
        model:Product,
        as:'productDetails',
        attributes:['title'],
      },
      transaction: t,
    });
    console.log({
  pausedOrder,
  pause: pausedOrder?.pause,
  start_period: pausedOrder?.start_period,
  paused_period: pausedOrder?.paused_period
});


    if (
  !pausedOrder ||
  pausedOrder.pause !== true || // or !== 1 if stored as integer
  !pausedOrder.start_period ||
  !pausedOrder.paused_period
) {
  if (!t.finished) await t.rollback();
  return res.status(404).json({
    ResponseCode: "404",
    Result: "false",
    ResponseMsg: "Paused product not found or not paused",
  });
}


    const order = await SubscribeOrder.findByPk(orderId, { transaction: t });
    if (!order) {
      if (!t.finished) await t.rollback();
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order not found",
      });
    }

    const store = await Store.findByPk(order.store_id, { transaction: t });
    if (!store) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Store not found",
      });
    }

    const user = await User.findByPk(uid, { transaction: t });
    if (!user) {
      if (!t.finished) await t.rollback();
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User not found",
      });
    }

    await SubscribeOrderProduct.update(
      {
        pause: false,
        status: "Active",
        paused_period:null,
        start_period:null
      },
      {
        where: { id: subscribeOrderProductId },
        transaction: t,
      }
    );

    try {
      await Promise.all([
        sendPushNotification({
          appId: process.env.ONESIGNAL_CUSTOMER_APP_ID,
          apiKey: process.env.ONESIGNAL_CUSTOMER_API_KEY,
          playerIds: [user.one_subscription],
          data: { user_id: user.id, type: "Subscription order resumed" },
          contents: {
            en: `${user.name}, Your subscription order ${order.order_id} has been resumed!`,
          },
          headings: { en: "Subscription Order Resumed!" },
        }),
        sendPushNotification({
          appId: process.env.ONESIGNAL_STORE_APP_ID,
          apiKey: process.env.ONESIGNAL_STORE_API_KEY,
          playerIds: [store.one_subscription],
          data: { store_id: store.id, type: "subscription order resumed" },
          contents: { en: `Subscription order resumed! Order ID: ${order.order_id}` },
          headings: { en: "Subscription Order Resumed!" },
        }),
        sendInAppNotification({
          uid,
          title: "Subscription Order Resumed",
          description: `Your subscription order ${order.order_id} has been resumed.`,
        }),
        sendInAppNotification({
          uid: store.id,
          title: "Subscription Order Resumed",
          description: `Subscription order resumed! Order ID: ${order.order_id}`,
        }),
      ]);
    } catch (notificationError) {
      console.error("Resume notification error:", notificationError.message);
    }

    await t.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Subscription order resumed successfully!",
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error resuming subscription order:", {
      message: error.message,
      stack: error.stack,
      orderId,
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

// const autoResumeSubscriptionOrder = async () => {
//   console.log("Running auto-resume job for paused subscription orders...");
//   const currentDate = new Date();
//   const t = await sequelize.transaction();
//   try {
//     const pausedOrders = await SubscribeOrder.findAll({
//       where: { status: "Paused" },
//       transaction: t,
//     });

//     for (const order of pausedOrders) {
//       const latestPause = order.paused_periods[order.paused_periods.length - 1];
//       if (!latestPause) continue;

//       const pauseEnd = new Date(latestPause.end_date);
//       const refundDate = new Date(pauseEnd);
//       refundDate.setDate(refundDate.getDate() + 1);

//       if (currentDate < refundDate) continue;

//       const pauseStart = new Date(latestPause.start_date);
//       const pausedDays = Math.ceil((pauseEnd - pauseStart) / (1000 * 60 * 60 * 24)) + 1;

//       const orderProducts = await SubscribeOrderProduct.findAll({
//         where: { oid: order.id },
//         transaction: t,
//       });

//       let refundAmount = 0;
//       const orderStart = new Date(order.start_date);
//       const orderEnd = new Date(order.end_date);
//       const pausedPeriods = order.paused_periods || [];

//       for (const product of orderProducts) {
//         const totalDeliveryDays = calculateDeliveryDays(orderStart, orderEnd, product.days, pausedPeriods);
//         if (totalDeliveryDays === 0) continue;

//         const perDayCost = product.price / totalDeliveryDays;
//         refundAmount += parseFloat((perDayCost * pausedDays).toFixed(2));
//       }

//       const user = await User.findByPk(order.uid, { transaction: t });
//       const store = await Store.findByPk(order.store_id, { transaction: t });

//       if (!existingRefund && user) {
//         await user.update({ wallet: user.wallet + refundAmount }, { transaction: t });

//         await WalletReport.create(
//           {
//             uid: order.uid,
//             amt: refundAmount,
//             message: `Refund for paused subscription order ${order.order_id} for ${pausedDays} days.`,
//             transaction_no: order.order_id,
//             tdate: new Date(),
//             transaction_type: "Credited",
//             status: 1,
//           },
//           { transaction: t }
//         );

//         try {
//           await axios.post(
//             "https://onesignal.com/api/v1/notifications",
//             {
//               app_id: process.env.ONESIGNAL_CUSTOMER_APP_ID,
//               include_player_ids: [user.one_subscription],
//               data: { user_id: user.id, type: "Subscription refund credited" },
//               contents: {
//                 en: `${user.name}, ₹${refundAmount} has been credited to your wallet for paused order ${order.order_id}!`,
//               },
//               headings: { en: "Refund Credited!" },
//             },
//             {
//               headers: {
//                 "Content-Type": "application/json; charset=utf-8",
//                 Authorization: `Basic ${process.env.ONESIGNAL_CUSTOMER_API_KEY}`,
//               },
//             }
//           );
//         } catch (error) {
//           console.error("User refund notification error:", error.message);
//         }

//         await Notification.create(
//           {
//             uid: order.uid,
//             datetime: new Date(),
//             title: "Refund Credited",
//             description: `₹${refundAmount} credited for paused order ${order.order_id}.`,
//           },
//           { transaction: t }
//         );
//       }

//       await order.update({ status: "Active" }, { transaction: t });

//       if (user) {
//         try {
//           await axios.post(
//             "https://onesignal.com/api/v1/notifications",
//             {
//               app_id: process.env.ONESIGNAL_CUSTOMER_APP_ID,
//               include_player_ids: [user.one_subscription],
//               data: { user_id: user.id, type: "Subscription order resumed" },
//               contents: {
//                 en: `${user.name}, Your subscription order ${order.order_id} has been resumed!`,
//               },
//               headings: { en: "Subscription Order Resumed!" },
//             },
//             {
//               headers: {
//                 "Content-Type": "application/json; charset=utf-8",
//                 Authorization: `Basic ${process.env.ONESIGNAL_CUSTOMER_API_KEY}`,
//               },
//             }
//           );
//         } catch (error) {
//           console.error("User resume notification error:", error.message);
//         }
//       }

//       if (store) {
//         try {
//           await axios.post(
//             "https://onesignal.com/api/v1/notifications",
//             {
//               app_id: process.env.ONESIGNAL_STORE_APP_ID,
//               include_player_ids: [store.one_subscription],
//               data: { store_id: store.id, type: "subscription order resumed" },
//               contents: {
//                 en: `Subscription order resumed! Order ID: ${order.order_id}`,
//               },
//               headings: { en: "Subscription Order Resumed" },
//             },
//             {
//               headers: {
//                 "Content-Type": "application/json; charset=utf-8",
//                 Authorization: `Basic ${process.env.ONESIGNAL_STORE_API_KEY}`,
//               },
//             }
//           );
//         } catch (error) {
//           console.error("Store resume notification error:", error.message);
//         }
//       }

//       await Promise.all([
//         user &&
//         Notification.create(
//           {
//             uid: order.uid,
//             datetime: new Date(),
//             title: "Subscription Order Resumed",
//             description: `Your subscription order ${order.order_id} has been resumed.`,
//           },
//           { transaction: t }
//         ),
//         store &&
//         Notification.create(
//           {
//             uid: store.id,
//             datetime: new Date(),
//             title: "Subscription Order Resumed",
//             description: `Subscription order resumed! Order ID: ${order.order_id}`,
//           },
//           { transaction: t }
//         ),
//       ]);
//     }

//     await t.commit();
//     console.log("Auto-resume job completed successfully.");
//   } catch (error) {
//     await t.rollback();
//     console.error("Error in auto-resume job:", error.message);
//   }
// };

// Schedule daily at midnight
// cron.schedule("0 0 * * *", autoResumeSubscriptionOrder);



// const getOrdersByStatus = async (req, res) => {
//   const uid = req.user.userId;
//   if (!uid) {
//     return res.status(401).json({
//       ResponseCode: "401",
//       Result: "false",
//       ResponseMsg: "Unauthorized",
//     });
//   }

//   try {
//     const orders = await SubscribeOrder.findAll({
//       where: { uid },
//       attributes: ['id', 'uid', 'status', 'createdAt', 'address_id', 'order_id'],
//       include: [
//         {
//           model: SubscribeOrderProduct,
//           as: "orderProducts",
//           attributes: ["id",  "timeslot_id", "weight_id", "product_id", "status"],
//           include: [
//             {
//               model: Time,
//               as: "timeslotss",
//               attributes: ["id", "mintime", "maxtime"],
//             },
//             {
//               model: WeightOption,
//               as: "subscribeProductWeight",
//               attributes: ["id", "normal_price", "subscribe_price", "mrp_price", "weight"],
//             },
//             {
//               model: Product,
//               as: "productDetails",
//               attributes: ["id", "title", "img", "description"],
//             },
//           ],
//         },
//         {
//           model: Address,
//           as: "subOrdAddress",
//         },
//         {
//           model: Review,
//           as: "suborderdeliveryreview",
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     // Attach product reviews and determine group status
//     for (let order of orders) {
//       let productStatuses = order.orderProducts.map(p => p.status);
//       const allCompleted = productStatuses.every(status => status === "Completed");
//       const allCancelled = productStatuses.every(status => status === "Cancelled");

//       console.log(productStatuses,"iiiiiiiiiiiiiiiiiiiiiiii");

//       if(productStatuses.includes("Pending")){
//         order.status = "Pending";
//         order.setDataValue("group_status", "Completed");
//       }else if(productStatuses.includes("completed")){
//         order.status = "Completed";
//         order.setDataValue("group_status", "Completed");
//       } else if(productStatuses.includes("cancelled")){
//         order.status = "Cancelled";
//         order.setDataValue("group_status", "Cancelled");
//       }

//       // if (order.status === "Completed" && allCompleted) {
//       //   order.setDataValue("group_status", "Completed");
//       // } else if (order.status === "Cancelled" && allCancelled) {
//       //   order.setDataValue("group_status", "Cancelled");
//       // } else {
//       //   order.setDataValue("group_status", "InProgress");
//       // }

//       // Attach product reviews
//       for (let orderProduct of order.orderProducts) {
//         const productReviews = await ProductReview.findAll({
//           where: {
//             user_id: uid,
//             product_id: orderProduct.productDetails?.id,
//             order_id: order.id,
//           },
//         });
//         orderProduct.productDetails?.setDataValue("ProductReviews", productReviews);
//       }
//     }

//     res.status(200).json({
//       ResponseCode: "200",
//       Result: "true",
//       ResponseMsg: "Subscribe Orders fetched successfully!",
//       orders,
//     });

//   } catch (error) {
//     console.error("Error fetching orders:", error.stack);
//     res.status(500).json({
//       ResponseCode: "500",
//       Result: "false",
//       ResponseMsg: "Server Error",
//       error: error.message,
//       stack: error.stack,
//     });
//   }
// };

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
      attributes: ['id', 'uid', 'status', 'createdAt', 'address_id', 'order_id'],
      include: [
        {
          model: SubscribeOrderProduct,
          as: "orderProducts",
          attributes: ["id", "timeslot_id", "weight_id", "product_id", "status"],
          include: [
            {
              model: Time,
              as: "timeslotss",
              attributes: ["id", "mintime", "maxtime"],
            },
            {
              model: WeightOption,
              as: "subscribeProductWeight",
              attributes: ["id", "normal_price", "subscribe_price", "mrp_price", "weight"],
            },
            {
              model: Product,
              as: "productDetails",
              attributes: ["id", "title", "img", "description"],
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

    for (let order of orders) {
      const productStatuses = order.orderProducts.map(p => p.status?.toLowerCase());

      const hasPending = productStatuses.includes("pending");
      const hasCompleted = productStatuses.includes("completed");
      const allCancelled = productStatuses.every(status => status === "cancelled");

      // Determine and override the order status dynamically
      if (hasPending) {
        order.setDataValue("group_status", "Pending");
        order.status = "Pending";
      } else if (hasCompleted) {
        order.setDataValue("group_status", "Completed");
        order.status = "Completed";
      } else if (allCancelled) {
        order.setDataValue("group_status", "Cancelled");
        order.status = "Cancelled";
      } else {
        order.setDataValue("group_status", "InProgress");
        order.status = "InProgress";
      }

      // Attach product reviews
      for (let orderProduct of order.orderProducts) {
        const productReviews = await ProductReview.findAll({
          where: {
            user_id: uid,
            product_id: orderProduct.productDetails?.id,
            order_id: order.id,
          },
        });
        orderProduct.productDetails?.setDataValue("ProductReviews", productReviews);
      }
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
  const { id } = req.params;

  try {
    if (!Number.isInteger(parseInt(id))) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid Order ID",
      });
    }

    const orderDetails = await SubscribeOrder.findOne({
      where: { id },
      attributes: ['id', 'uid', 'status', 'createdAt', 'address_id'], // Explicitly list fields
      include: [
        {
          model: User,
          as: 'user',
        },
        {
          model: SubscribeOrderProduct,
          as: "orderProducts",
          attributes: ['timeslot_id', 'weight_id', 'product_id','status'],
          include: [
            {
              model: Product,
              as: "productDetails",
              attributes: ['id', 'title', 'img', 'description'],
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
      ],
      order: [['createdAt', 'DESC']],
      logging: console.log, // Debug SQL
    });

    if (!orderDetails) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order Not Found",
      });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Instant Order fetched successfully!",
      orderDetails,
    });
  } catch (error) {
    console.error("Error fetching order:", error.stack);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: error.message,
      stack: error.stack,
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
    console.log(orderProduct,"ooooooooooooooooooo")
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

    const totalDeliveryDays = calculateDeliveryDays(startDate, endDate, orderProduct.repeat_day || [], orderProduct.paused_periods || []);
    const completedDeliveryDays = calculateDeliveryDays(
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
      await Promise.all([
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
  editSubscriptionOrder,
  getOrdersByStatus,
  getOrderDetails,
  cancelOrder,
  pauseSubscriptionOrder,
  resumeSubscriptionOrder,
  // autoResumeSubscriptionOrder,
  cancelAllProductsInSubscriptionOrder
};
