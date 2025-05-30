const { Sequelize, Op } = require("sequelize");

const Product = require("../../Models/Product");
const axios = require("axios");
const NormalOrder = require("../../Models/NormalOrder");
const NormalOrderProduct = require("../../Models/NormalOrderProduct");
const Notification = require("../../Models/Notification");
const User = require("../../Models/User");
const ProductReview = require("../../Models/ProductReview");
const Address = require("../../Models/Address");
const Time = require("../../Models/Time");
const Review = require("../../Models/review");
const Store = require("../../Models/Store");
const sequelize = require("../../config/db");
const WeightOption = require("../../Models/WeightOption");
const Cart = require("../../Models/Cart");
const Coupon = require("../../Models/Coupon");
const { sendPushNotification } = require("../../notifications/alert.service");
const { v4: uuidv4 } = require("uuid");
const {
  sendInAppNotification,
} = require("../../notifications/notification.service");
const PersonRecord = require("../../Models/PersonRecord");
const StoreWeightOption = require("../../Models/StoreWeightOption");
const WalletReport = require("../../Models/WalletReport");
const ProductInventory = require("../../Models/ProductInventory");
const Rider = require("../../Models/Rider");
const CarryBag = require("../../Models/Carry_Bag");

const generateOrderId = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${randomNum}`;
};

const retryTransaction = async (fn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (
        (error.message.includes("Lock wait timeout exceeded") ||
         error.message.includes("Deadlock found when trying to get lock") ||
         error.message.includes("Table definition has changed")) &&
        attempt < maxRetries
      ) {
        console.warn(`Retry ${attempt}/${maxRetries} due to: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        continue;
      }
      throw error;
    }
  }
};

const instantOrder = async (req, res) => {
  const {
    products,
    timeslot_id,
    o_type,
    coupon_id,
    subtotal,
    d_charge,
    // store_charge,
    tax,
    o_total,
    odate,
    store_id,
    address_id,
    a_note,
    trans_id,
    receiver,
    carry_bag_cost
  } = req.body;

  console.log("Request body:", req.body);

  // Validate authentication
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized: No user authenticated or invalid token!",
    });
  }

  const uid = req.user.userId;

  // Validate required fields
  if (
    !uid ||
    !products ||
    !Array.isArray(products) ||
    products.length === 0 ||
    !o_type ||
    !store_id ||
    subtotal == null ||
    o_total == null ||
    !odate
  ) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Missing or invalid required fields!",
    });
  }

  // Validate products
  for (const item of products) {
    if (!item.product_id || !item.weight_id || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Each product must have a valid product_id, weight_id, and quantity > 0!",
      });
    }
  }

  // Validate receiver
  if (receiver && (!receiver.name || !receiver.mobile)) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Receiver name and mobile are required if provided!",
    });
  }

  // Parse odate
  const parsedOdate = new Date(odate);
  if (isNaN(parsedOdate)) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Invalid order date format!",
    });
  }

  try {
    const result = await retryTransaction(async () => {
      const transaction = await sequelize.transaction();

      try {
        // Verify user
        const user = await User.findByPk(uid, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!user) {
          throw new Error("User not found");
        }

        // Verify store
        const store = await Store.findByPk(store_id, { transaction });
        if (!store) {
          throw new Error("Store not found");
        }

        // Validate timeslot_id if provided
        if (timeslot_id) {
          const timeslot = await Time.findByPk(timeslot_id, { transaction });
          if (!timeslot) {
            throw new Error("Invalid timeslot_id!");
          }
        }

        // Validate address
        let orderAddressId = address_id;
        if (receiver && receiver.address_id) {
          orderAddressId = receiver.address_id;
          const receiverAddress = await Address.findByPk(receiver.address_id, { transaction });
          if (!receiverAddress) {
            throw new Error("Receiver address does not exist");
          }
          if (receiverAddress.uid !== uid) {
            throw new Error("Receiver address does not belong to you");
          }
        } else if (address_id) {
          const orderAddress = await Address.findByPk(address_id, { transaction });
          if (!orderAddress) {
            throw new Error("Order address does not exist");
          }
          if (orderAddress.uid !== uid) {
            throw new Error("Order address does not belong to you");
          }
        } else {
          throw new Error("Order address is required");
        }

        // Validate products, weights, and stock
        for (const item of products) {
          const product = await Product.findByPk(item.product_id, {
            transaction,
            lock: transaction.LOCK,
            include: [
              {
                model: WeightOption,
                as: "weightOptions",
                where: { id: item.weight_id },
              },
            ],
          });
          if (!product) {
            throw new Error(`Product with ID ${item.product_id} does not exist`);
          }
          if (!product.weightOptions || !product.weightOptions.length) {
            throw new Error(`Weight option ${item.weight_id} does not exist for product ${product.title}`);
          }
          const weightOption = product.weightOptions[0];

          if (product.out_of_stock === 1) {
            throw new Error(`Product ${product.title} is out of stock`);
          }
          if (product.quantity < item.quantity) {
            throw new Error(
              `Not enough stock for ${product.title}: only ${product.quantity} available, ${item.quantity} requested`
            );
          }

          const productInventory = await ProductInventory.findOne({
            where: { store_id, product_id: item.product_id, status: 1 },
            transaction,
            lock: transaction.LOCK,
          });
          if (!productInventory) {
            throw new Error(
              `No inventory found for ${product.title} in store ${store.store_name || store_id}`
            );
          }

          const storeWeightOption = await StoreWeightOption.findOne({
            where: {
              product_id: item.product_id,
              weight_id: item.weight_id,
              product_inventory_id: productInventory.id,
            },
            transaction,
            lock: transaction.LOCK,
          });
          if (!storeWeightOption) {
            throw new Error(
              `Weight option ${weightOption.weight} not available for ${product.title} in store ${store.store_name || store_id}`
            );
          }
          if (storeWeightOption.quantity < item.quantity) {
            throw new Error(
              `Not enough stock for ${product.title} (${weightOption.weight}) in store ${store.store_name || store_id}: only ${storeWeightOption.quantity} available, ${item.quantity} requested`
            );
          }
        }

        // Validate coupon
        let appliedCoupon;
        let couponAmount = 0;
        let finalTotal = parseFloat(o_total);

        if (coupon_id) {
          const coupon = await Coupon.findByPk(coupon_id, { transaction });
          if (!coupon) {
            throw new Error("Coupon does not exist");
          }
          const currentDate = new Date();
          if (coupon.status !== 1 || new Date(coupon.end_date) < currentDate) {
            throw new Error("Coupon is inactive or expired");
          }
          const subtotalNum = parseFloat(subtotal);
          if (subtotalNum < parseFloat(coupon.min_amt)) {
            throw new Error(
              `Subtotal (${subtotalNum}) is less than the minimum (${coupon.min_amt}) required for this coupon`
            );
          }
          couponAmount = parseFloat(coupon.coupon_val);
          finalTotal = finalTotal - couponAmount;
          if (finalTotal < 0) {
            throw new Error("Order total cannot be negative after coupon");
          }
          appliedCoupon = coupon;
        }

        const orderId = uuidv4();
        const orderNumber = generateOrderId();

        // Create Order
        const order = await NormalOrder.create(
          {
            id: orderId,
            uid,
            store_id,
            address_id: orderAddressId,
            odate: parsedOdate,
            timeslot_id,
            o_type,
            cou_id: appliedCoupon ? appliedCoupon.id : null,
            cou_amt: couponAmount,
            subtotal,
            d_charge: parseFloat(d_charge) || 0,
            // store_charge: parseFloat(store_charge) || 0,
            tax: parseFloat(tax) || 0,
            o_total: finalTotal,
            a_note,
            order_id: orderNumber,
            trans_id,
            carry_bag_cost: carry_bag_cost || 0,
          },
          { transaction }
        );

        console.log("Order created:", { id: order.id, order_id: orderNumber });

        // Create Receiver
        let receiverRecord;
        if (receiver) {
          receiverRecord = await PersonRecord.create(
            {
              id: uuidv4(),
              name: receiver.name,
              email: receiver.email || null,
              mobile: receiver.mobile,
              address_id: receiver.address_id || null,
              order_id: order.id,
            },
            { transaction }
          );
        }

        // Create Order Items and Update Quantities
        const items = [];
        for (const item of products) {
          const product = await Product.findByPk(item.product_id, { transaction });
          const weight = await WeightOption.findByPk(item.weight_id, { transaction });
          const itemPrice = weight.normal_price * item.quantity;

          const orderItem = await NormalOrderProduct.create(
            {
              id: uuidv4(),
              oid: order.id,
              product_id: item.product_id,
              pquantity: item.quantity,
              price: itemPrice,
              weight_id: item.weight_id,
            },
            { transaction }
          );
          items.push(orderItem);

          await Product.update(
            { quantity: product.quantity - item.quantity },
            { where: { id: item.product_id }, transaction }
          );

          const productInventory = await ProductInventory.findOne({
            where: { store_id, product_id: item.product_id, status: 1 },
            transaction,
          });

          await StoreWeightOption.update(
            { quantity: sequelize.literal(`quantity - ${item.quantity}`) },
            {
              where: {
                product_id: item.product_id,
                weight_id: item.weight_id,
                product_inventory_id: productInventory.id,
              },
              transaction,
            }
          );
        }

        // Remove Cart Items
        const cartItems = products.map(({ product_id, weight_id }) => ({
          uid,
          product_id,
          weight_id,
          orderType: "Normal",
        }));
        await Cart.destroy({ where: { [Op.or]: cartItems }, transaction });

        // Wallet Payment
        if (!trans_id) {
          if (user.wallet < finalTotal) {
            throw new Error("Insufficient wallet balance");
          }
          await User.update(
            { wallet: user.wallet - finalTotal },
            { where: { id: uid }, transaction }
          );
          await WalletReport.create(
            {
              id: uuidv4(),
              uid,
              message: `Debited for order ${order.order_id}`,
              status: 1,
              amt: Math.round(finalTotal),
              transaction_no: trans_id || `WALLET-${orderId}`,
              tdate: new Date(),
              transaction_type: "Debited",
            },
            { transaction }
          );
        }

        await transaction.commit();

        // Notifications
        try {
          await Promise.all([
            sendPushNotification({
              appId: process.env.ONESIGNAL_CUSTOMER_APP_ID,
              apiKey: process.env.ONESIGNAL_CUSTOMER_API_KEY,
              playerIds: [user.one_subscription],
              data: { user_id: user.id, type: "instant order placed" },
              contents: {
                en: receiver
                  ? `${user.name}, your order for ${receiver.name} has been confirmed!`
                  : `${user.name}, your order has been confirmed!`,
              },
              headings: { en: "Order Confirmed!" },
            }),
            sendPushNotification({
              appId: process.env.ONESIGNAL_STORE_APP_ID,
              apiKey: process.env.ONESIGNAL_STORE_API_KEY,
              playerIds: [store.one_subscription],
              data: { store_id: store.id, type: "new order received" },
              contents: {
                en: `New ${o_type.toLowerCase()} order received! Order ID: ${order.order_id}`,
              },
              headings: { en: "New Order" },
            }),
            sendInAppNotification({
              uid,
              title: "Order Instant Confirmed",
              description: receiver
                ? `Your order for ${receiver.name} created. Order ID: ${order.order_id}.`
                : `Your order created. Order ID: ${order.order_id}.`,
            }),
            sendInAppNotification({
              uid: store.id,
              title: "New Order Received",
              description: `A new ${o_type.toLowerCase()} order has been placed. Order ID: ${order.order_id}.`,
            }),
          ]);
        } catch (notificationError) {
          console.warn("Notification error:", notificationError);
        }

        return { order, orderItems: items, receiverRecord, appliedCoupon, finalTotal };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });

    const { order, orderItems, receiverRecord, appliedCoupon, finalTotal } = result;
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Instant Order Created Successfully",
      id: order.id,
      o_total: finalTotal,
      // order_number: order.order_id,
      coupon_applied: appliedCoupon
        ? {
            id: appliedCoupon.id,
            title: appliedCoupon.coupon_title,
            amount: parseFloat(appliedCoupon.coupon_val),
          }
        : null,
      items: orderItems,
      receiver: receiverRecord,
    });
  } catch (error) {
    console.error("Error creating order:", error.message);
    if (error.name === "SequelizeEagerLoadingError") {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid weight option specified for the product",
      });
    }
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: `Failed to create order: ${error.message}`,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Order again functionality
const instantOrderAgain = async (req, res) => {
  const uid = req.user.userId;
  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized: User not found!",
    });
  }

  const { orderId, tax, d_charge, store_charge, o_total, odate, subtotal } = req.body;
  if (!orderId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Order ID is required to reorder!",
    });
  }

  // Validate provided financial fields
  if (
    subtotal == null || isNaN(parseFloat(subtotal)) || parseFloat(subtotal) < 0 ||
    o_total == null || isNaN(parseFloat(o_total)) || parseFloat(o_total) < 0 ||
    d_charge == null || isNaN(parseFloat(d_charge)) || parseFloat(d_charge) < 0 ||
    store_charge == null || isNaN(parseFloat(store_charge)) || parseFloat(store_charge) < 0 ||
    tax == null || isNaN(parseFloat(tax)) || parseFloat(tax) < 0
  ) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Invalid or missing subtotal, o_total, d_charge, store_charge, or tax values!",
    });
  }

  // Parse and validate odate
  let parsedOdate = odate ? new Date(odate) : new Date();
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
  if (isNaN(parsedOdate) || parsedOdate < currentDate) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Invalid or past order date!",
    });
  }

  try {
    // Fetch previous order outside transaction
    console.log("Fetching previous order:", { orderId, uid });
    const previousOrder = await NormalOrder.findOne({
      where: { id: orderId, uid: uid, status: "Completed" },
      include: [
        {
          model: NormalOrderProduct,
          as: "NormalProducts",
          attributes: ["product_id", "pquantity", "weight_id"],
        },
        {
          model: PersonRecord,
          as: "receiver",
          attributes: ["name", "email", "mobile", "address_id"],
        },
        {
          model: Address,
          as: "instOrdAddress",
          attributes: ["id", "uid"],
        },
        {
          model: Time,
          as: "timeslot",
          attributes: ["id"],
        },
      ],
    });

    if (!previousOrder) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No previous completed order found!",
      });
    }

    if (previousOrder.uid !== uid) {
      return res.status(403).json({
        ResponseCode: "403",
        Result: "false",
        ResponseMsg: "You are not authorized to reorder this order!",
      });
    }

    // Map previous products for reordering (no changes allowed)
    const previousProducts = previousOrder.NormalProducts.map(item => ({
      product_id: item.product_id,
      quantity: item.pquantity,
      weight_id: item.weight_id,
    }));

    // Prepare receiver data if exists
    const receiver = previousOrder.receiver
      ? {
          name: previousOrder.receiver.name,
          email: previousOrder.receiver.email,
          mobile: previousOrder.receiver.mobile,
          address_id: previousOrder.receiver.address_id,
        }
      : null;

    // Extract order details
    const {
      timeslot_id,
      o_type,
      coupon_id,
      store_id,
      address_id,
      a_note,
      trans_id,
    } = previousOrder;

    // Validate required fields
    if (
      !previousProducts ||
      !Array.isArray(previousProducts) ||
      previousProducts.length === 0 ||
      !o_type ||
      !store_id
    ) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Missing or invalid required fields from previous order!",
      });
    }

    // Validate product data (weight_id is optional)
    for (const item of previousProducts) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Each product must have a valid product_id and quantity > 0!",
        });
      }
    }

    // Validate receiver data
    if (receiver && (!receiver.name || !receiver.mobile)) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Receiver name and mobile are required if provided!",
      });
    }

    const result = await retryTransaction(async () => {
      const transaction = await sequelize.transaction();
      let committed = false;

      try {
        console.log("Starting transaction for order:", { orderId, uid });

        // Verify user
        console.log("Verifying user:", { uid });
        const user = await User.findByPk(uid, { transaction });
        if (!user) {
          throw new Error("User not found");
        }

        // Verify store
        console.log("Verifying store:", { store_id });
        const store = await Store.findByPk(store_id, { transaction });
        if (!store) {
          throw new Error("Store not found");
        }

        // Validate timeslot_id if provided
        if (timeslot_id) {
          console.log("Validating timeslot:", { timeslot_id });
          const timeslot = await Time.findByPk(timeslot_id, { transaction });
          if (!timeslot) {
            throw new Error("Invalid timeslot_id!");
          }
        }

        // Validate address
        let orderAddressId = address_id;
        if (receiver && receiver.address_id) {
          orderAddressId = receiver.address_id;
          console.log("Validating receiver address:", { address_id: receiver.address_id });
          const receiverAddress = await Address.findByPk(receiver.address_id, { transaction });
          if (!receiverAddress) {
            throw new Error("Receiver address does not exist");
          }
          if (receiverAddress.uid !== uid) {
            throw new Error("Receiver address does not belong to you");
          }
        } else if (address_id) {
          console.log("Validating order address:", { address_id });
          const orderAddress = await Address.findByPk(address_id, { transaction });
          if (!orderAddress) {
            throw new Error("Order address does not exist");
          }
          if (orderAddress.uid !== uid) {
            throw new Error("Order address does not belong to you");
          }
        } else {
          throw new Error("Order address is required");
        }

        // Validate products, weights, and stock, and calculate subtotal
        let calculatedSubtotal = 0;
        for (const item of previousProducts) {
          console.log("Validating product:", { product_id: item.product_id, weight_id: item.weight_id });
          const product = await Product.findByPk(item.product_id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
            include: [
              {
                model: WeightOption,
                as: "weightOptions",
                where: item.weight_id ? { id: item.weight_id } : undefined,
                required: false,
              },
            ],
          });
          if (!product) {
            throw new Error(`Product with ID ${item.product_id} does not exist`, {
              cause: { product_id: item.product_id, weight_id: item.weight_id }
            });
          }

          const weightOption = product.weightOptions && product.weightOptions.length ? product.weightOptions[0] : null;
          if (item.weight_id && !weightOption) {
            throw new Error(`Weight option ${item.weight_id} does not exist for product ${product.title}`, {
              cause: { product_id: item.product_id, weight_id: item.weight_id }
            });
          }

          // Check stock availability
          if (product.out_of_stock === 1) {
            throw new Error(`Product ${product.title} is out of stock`, {
              cause: { product_id: item.product_id, weight_id: item.weight_id }
            });
          }
          if (product.quantity < item.quantity) {
            throw new Error(
              `Not enough stock for ${product.title}: only ${product.quantity} available, ${item.quantity} requested`,
              { cause: { product_id: item.product_id, weight_id: item.weight_id } }
            );
          }

          const productInventory = await ProductInventory.findOne({
            where: { store_id, product_id: item.product_id, status: 1 },
            transaction,
          });
          if (!productInventory) {
            throw new Error(
              `No inventory found for ${product.title} in store ${store.store_name || store_id}`,
              { cause: { product_id: item.product_id, weight_id: item.weight_id } }
            );
          }

          if (weightOption) {
            console.log("Checking store weight option:", { product_id: item.product_id, weight_id: item.weight_id });
            const storeWeightOption = await StoreWeightOption.findOne({
              where: {
                product_id: item.product_id,
                weight_id: item.weight_id,
                product_inventory_id: productInventory.id,
              },
              transaction,
              lock: transaction.LOCK.UPDATE,
            });
            if (!storeWeightOption) {
              throw new Error(
                `Weight option ${weightOption.weight} not available for ${product.title} in store ${store.store_name || store_id}`,
                { cause: { product_id: item.product_id, weight_id: item.weight_id } }
              );
            }
            if (storeWeightOption.quantity < item.quantity) {
              throw new Error(
                `Not enough stock for ${product.title} (${weightOption.weight}) in store ${store.store_name || store_id}: only ${storeWeightOption.quantity} available, ${item.quantity} requested`,
                { cause: { product_id: item.product_id, weight_id: item.weight_id } }
              );
            }
          }

          // Calculate subtotal using current prices
          calculatedSubtotal += weightOption ? weightOption.normal_price * item.quantity : product.normal_price * item.quantity;
        }

        // Validate provided subtotal against calculated subtotal
        const providedSubtotal = parseFloat(subtotal);
        if (Math.abs(calculatedSubtotal - providedSubtotal) > 0.01) {
          throw new Error(`Provided subtotal (${providedSubtotal}) does not match calculated subtotal (${calculatedSubtotal})`);
        }

        // Validate coupon
        let appliedCoupon;
        let couponAmount = 0;
        let finalTotal = providedSubtotal + parseFloat(d_charge) + parseFloat(store_charge) + parseFloat(tax);

        if (coupon_id) {
          console.log("Validating coupon:", { coupon_id });
          const coupon = await Coupon.findByPk(coupon_id, { transaction });
          if (!coupon) {
            throw new Error("Coupon does not exist");
          }
          const currentDate = new Date();
          if (coupon.status !== 1 || new Date(coupon.end_date) < currentDate) {
            throw new Error("Coupon is inactive or expired");
          }
          if (providedSubtotal < parseFloat(coupon.min_amt)) {
            throw new Error(
              `Subtotal (${providedSubtotal}) is less than the minimum (${coupon.min_amt}) required for this coupon`
            );
          }
          couponAmount = parseFloat(coupon.coupon_val);
          finalTotal -= couponAmount;
          if (finalTotal < 0) {
            throw new Error("Order total cannot be negative after coupon");
          }
          appliedCoupon = coupon;
        }

        // Validate provided o_total
        const providedTotal = parseFloat(o_total);
        if (Math.abs(finalTotal - providedTotal) > 0.01) {
          throw new Error(`Provided order total (${providedTotal}) does not match calculated total (${finalTotal})`);
        }

        const newOrderId = uuidv4();
        const newOrderNumber = generateOrderId();

        // Create Order
        console.log("Creating order:", { newOrderId, orderNumber: newOrderNumber });
        const order = await NormalOrder.create(
          {
            id: newOrderId,
            uid,
            store_id,
            address_id: orderAddressId,
            odate: parsedOdate,
            timeslot_id,
            o_type,
            cou_id: appliedCoupon ? appliedCoupon.id : null,
            cou_amt: couponAmount,
            subtotal: providedSubtotal,
            d_charge: parseFloat(d_charge),
            store_charge: parseFloat(store_charge),
            tax: parseFloat(tax),
            o_total: finalTotal,
            a_note,
            order_id: newOrderNumber,
            trans_id,
          },
          { transaction }
        );

        // Create Receiver
        let receiverRecord;
        if (receiver) {
          console.log("Creating receiver record for order:", { orderId: newOrderId });
          receiverRecord = await PersonRecord.create(
            {
              id: uuidv4(),
              name: receiver.name,
              email: receiver.email || null,
              mobile: receiver.mobile,
              address_id: receiver.address_id || null,
              order_id: order.id,
            },
            { transaction }
          );
        }

        // Create Order Items and Update Quantities
        const items = [];
        for (const item of previousProducts) {
          console.log("Creating order item for product:", { product_id: item.product_id });
          const product = await Product.findByPk(item.product_id, { transaction });
          const weight = item.weight_id ? await WeightOption.findByPk(item.weight_id, { transaction }) : null;
          const itemPrice = weight ? weight.normal_price * item.quantity : product.normal_price * item.quantity;

          const orderItem = await NormalOrderProduct.create(
            {
              id: uuidv4(),
              oid: order.id,
              product_id: item.product_id,
              pquantity: item.quantity,
              price: itemPrice,
              weight_id: item.weight_id,
            },
            { transaction }
          );
          items.push(orderItem);

          // Update product stock
          console.log("Updating product stock:", { product_id: item.product_id, quantity: item.quantity });
          await Product.update(
            { quantity: sequelize.literal(`quantity - ${item.quantity}`) },
            { where: { id: item.product_id }, transaction }
          );

          if (weight) {
            const productInventory = await ProductInventory.findOne({
              where: { store_id, product_id: item.product_id, status: 1 },
              transaction,
            });

            console.log("Updating store weight option:", { product_id: item.product_id, weight_id: item.weight_id });
            await StoreWeightOption.update(
              { quantity: sequelize.literal(`quantity - ${item.quantity}`) },
              {
                where: {
                  product_id: item.product_id,
                  weight_id: item.weight_id,
                  product_inventory_id: productInventory.id,
                },
                transaction,
              }
            );
          }
        }

        // Remove Cart Items
        console.log("Removing cart items for user:", { uid });
        const cartItems = previousProducts.map(({ product_id, weight_id }) => ({
          uid,
          product_id,
          weight_id,
          orderType: "Normal",
        }));
        await Cart.destroy({ where: { [Op.or]: cartItems }, transaction });

        // Wallet Payment
        if (!trans_id) {
          console.log("Processing wallet payment for user:", { uid, finalTotal });
          if (user.wallet < finalTotal) {
            throw new Error("Insufficient wallet balance");
          }
          await User.update(
            { wallet: sequelize.literal(`wallet - ${finalTotal}`) },
            { where: { id: uid }, transaction }
          );
          await WalletReport.create(
            {
              id: uuidv4(),
              uid,
              message: `Debited for order ${order.order_id}`,
              status: 1,
              amt: Math.round(finalTotal),
              transaction_no: trans_id || `WALLET-${newOrderId}`,
              tdate: new Date(),
              transaction_type: "Debited",
            },
            { transaction }
          );
        }

        await transaction.commit();
        committed = true;
        console.log("Transaction committed for order:", { orderId: newOrderId });

        // Notifications
        try {
          await Promise.all([
            sendPushNotification({
              appId: process.env.ONESIGNAL_CUSTOMER_APP_ID,
              apiKey: process.env.ONESIGNAL_CUSTOMER_API_KEY,
              playerIds: [user.one_subscription],
              data: { user_id: user.id, type: "instant order placed" },
              contents: {
                en: receiver
                  ? `${user.name}, your order for ${receiver.name} has been confirmed!`
                  : `${user.name}, your order has been confirmed!`,
              },
              headings: { en: "Order Confirmed!" },
            }),
            sendPushNotification({
              appId: process.env.ONESIGNAL_STORE_APP_ID,
              apiKey: process.env.ONESIGNAL_STORE_API_KEY,
              playerIds: [store.one_subscription],
              data: { store_id: store.id, type: "new order received" },
              contents: {
                en: `New ${o_type.toLowerCase()} order received! Order ID: ${order.order_id}`,
              },
              headings: { en: "New Order" },
            }),
            sendInAppNotification({
              uid,
              title: "Order Instant Confirmed",
              description: receiver
                ? `Your order for ${receiver.name} created. Order ID: ${order.order_id}.`
                : `Your order created. Order ID: ${order.order_id}.`,
            }),
            sendInAppNotification({
              uid: store.id,
              title: "New Order Received",
              description: `A new ${o_type.toLowerCase()} order has been placed. Order ID: ${order.order_id}.`,
            }),
          ]);
        } catch (notificationError) {
          console.warn("Notification error:", notificationError);
        }

        return { order, orderItems: items, receiverRecord, appliedCoupon, finalTotal };
      } catch (error) {
        if (!committed) {
          try {
            await transaction.rollback();
            console.log("Transaction rolled back for order:", { orderId });
          } catch (rollbackError) {
            console.error("Rollback error:", rollbackError.message);
          }
        }
        throw error;
      }
    });

    const { order, orderItems, receiverRecord, appliedCoupon, finalTotal } = result;
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Instant Order Created Successfully",
      id: order.id,
      o_total: finalTotal,
      coupon_applied: appliedCoupon
        ? {
            id: appliedCoupon.id,
            title: appliedCoupon.coupon_title,
            amount: parseFloat(appliedCoupon.coupon_val),
          }
        : null,
      items: orderItems,
      receiver: receiverRecord,
    });
  } catch (error) {
    console.error("Error creating order again:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    if (error.name === "SequelizeEagerLoadingError") {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid weight option specified for the product",
        product_id: error.cause?.product_id,
        weight_id: error.cause?.weight_id
      });
    }
    if (
      error.message.includes("Not enough stock") ||
      error.message.includes("out of stock") ||
      error.message.includes("Weight option") ||
      error.message.includes("does not exist") ||
      error.message.includes("subtotal") ||
      error.message.includes("order total")
    ) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: error.message,
        product_id: error.cause?.product_id,
        weight_id: error.cause?.weight_id
      });
    }
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: `Failed to create order: ${error.message}`,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getOrdersByStatus = async (req, res) => {
  try {
    const { uid, status } = req.body;

    const validStatuses = [
      "Pending",
      "Processing",
      "Completed",
      "Cancelled",
      "On Route",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order status" });
    }
    console.log(1);
    const orders = await NormalOrder.findAll({
      where: { uid, status },
      include: [
        {
          model: NormalOrderProduct,
          as: "NormalProducts",
          include: [
            {
              model: WeightOption,
              as: "productWeight",
              attributes: [
                "id",
                "normal_price",
                "subscribe_price",
                "mrp_price",
                "weight",
              ],
            },
            {
              model: Product,
              as: "ProductDetails", // Ensure 'productDetails' alias is correct in the model associations
              attributes: ["id", "title", "img", "description"], // Specify the fields you need
              include: [
                {
                  model: ProductReview,
                  as: "ProductReviews",
                },
              ],
            },
          ],
          attributes: ["pquantity"],
        },
        {
          model: Address,
          as: "instOrdAddress",
        },
        {
          model: Time,
          as: "timeslot",
          attributes: ["id", "mintime", "maxtime"],
        },
        {
          model: Review,
          as: "normalorderdeliveryreview",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(orders, "ooooooooooooooooo");

    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Instant Order fetched successfully!",
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};

const getOrderDetails = async (req, res) => {
  const uid = req.user?.userId;

  // Check if userId exists
  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized: User not found!",
    });
  }

  try {
    const { id } = req.params;

    // Fetch order with all necessary includes
    const order = await NormalOrder.findOne({
      where: { id, uid },
      include: [
        {
          model: NormalOrderProduct,
          as: "NormalProducts",
          attributes: ["id", "product_id", "pquantity", "price", "weight_id"],
          include: [
            {
              model: WeightOption,
              as: "productWeight",
              attributes: ["id", "normal_price", "subscribe_price", "mrp_price", "weight"],
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["id", "title", "img", "description"],
                },
              ],
            },
            {
              model: Product,
              as: "ProductDetails",
              attributes: ["id", "title", "img", "description"],
              include: [
                {
                  model: ProductReview,
                  as: "ProductReviews",
                  attributes: ["id", "rating", "review", "user_id", "order_id"],
                  where: {
                    user_id: uid,
                    order_id: id,
                  },
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: Address,
          as: "instOrdAddress",
          attributes: [
            "id",
            "uid",
            "address",
            "landmark",
            "r_instruction",
            "a_type",
            "a_lat",
            "a_long",
          ],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "mobile", "email"],
            },
          ],
        },
        {
          model: Time,
          as: "timeslot",
          attributes: ["id", "mintime", "maxtime"],
        },
        {
          model: Rider,
          as: "riders",
          attributes: ["id", "title", "mobile", "email"],
          where: {
            id: sequelize.col("NormalOrder.rid"),
          },
          required: false,
        },
        {
          model: PersonRecord,
          as: "receiver",
          attributes: ["id", "name", "email", "mobile", "address_id"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Check if order exists
    if (!order) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order not found",
      });
    }

    const orderData = order.toJSON();
    const hasReviews = orderData.NormalProducts.some(product => 
      product.ProductDetails?.ProductReviews?.length > 0
    );

    // Calculate average rating for all products in the order
    const allReviews = orderData.NormalProducts.flatMap(product => 
      product.ProductDetails?.ProductReviews || []
    );
    const averageRating = allReviews.length > 0
      ? Number((allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length).toFixed(2))
      : null; // or 0 if you prefer a default value

    // Format response
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Instant Order details fetched successfully!",
      orderDetails: {
        id: order.id,
        order_id: order.order_id,
        uid: order.uid,
        store_id: order.store_id,
        address: order.instOrdAddress,
        odate: order.odate,
        status: order.status,
        timeslot: order.timeslot,
        o_type: order.o_type,
        cou_id: order.cou_id,
        cou_amt: order.cou_amt,
        subtotal: order.subtotal,
        d_charge: order.d_charge,
        store_charge: order.store_charge,
        tax: order.tax,
        o_total: order.o_total,
        a_note: order.a_note,
        rid:order.rid,
        trans_id: order.trans_id,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        products: order.NormalProducts,
        receiver: order.receiver,
        rider:order.riders,
        hasReviews: hasReviews,
        averageRating: averageRating,
      },
    });
  } catch (error) {
    console.error("Error fetching order details:", error.message);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.body;

    const uid = req.user.userId;

    // Find the order
    const order = await NormalOrder.findOne({ where: { id } });

    if (!order) {
      return res.status(400).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order not found",
      });
    }

    const user = await User.findByPk(uid);

    if (!user) {
      return res.status(400).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User not found",
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order is already cancelled",
      });
    }
    order.status = "Cancelled";
    await order.save();

    try {
      const notificationContent = {
        app_id: process.env.ONESIGNAL_CUSTOMER_APP_ID,
        include_player_ids: [user.one_subscription],
        data: { user_id: user.id, type: "instant order Cancelled" },
        contents: {
          en: `${user.name}, Your order  has been Cancelled!`,
        },
        headings: { en: "Order Cancelled!" },
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

      console.log(response, "notification sent");
    } catch (error) {
      console.log(error);
    }

    await Notification.create({
      uid,
      datetime: new Date(),
      title: "Order Instant Confirmed",
      description: `Your order created  Order ID ${order.id} .`,
    });

    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Order cancelled successfully!",
      order,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
  }
};

const getRecommendedProducts = async (req, res) => {
  console.log("Reached getRecommendedProducts API");
  // const uid = '8333f3ff-98fa-4df5-956c-4b58aabce493';
  const uid = req.user?.id;

  if (!uid) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "User not authenticated",
    });
  }

  try {
    // Fetch recent orders for the user
    const recentOrders = await NormalOrder.findAll({
      where: { uid: uid },
      include: [
        {
          model: NormalOrderProduct,
          as: "NormalProducts",
          attributes: ["product_id"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    if (!recentOrders.length) {
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "No recent purchases found",
        recommendedProducts: [],
      });
    }

    // Extract product IDs from recent orders
    const productIds = [
      ...new Set(
        recentOrders.flatMap((order) =>
          order.orderProducts.map((op) => op.product_id)
        )
      ),
    ];

    // Find similar products based on the category of purchased products
    const purchasedProducts = await Product.findAll({
      where: { id: productIds },
      attributes: ["cat_id"],
    });

    const categoryIds = [
      ...new Set(purchasedProducts.map((p) => p.category_id)),
    ];

    const recommendedProducts = await Product.findAll({
      where: { category_id: categoryIds, id: { [Op.notIn]: productIds } },
      attributes: ["id", "name", "normal_price", "image"],
      limit: 10,
    });

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Recommended products fetched successfully",
      recommendedProducts,
    });
  } catch (error) {
    console.error("Error fetching recommended products:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};

//get near by store products
const getNearByProducts = async (req, res) => {
  const uid = req.user.userId;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized: User not found!" });
  }
  try {
    const userAddress = await Address.findOne({ where: { uid: uid } });
    if (!userAddress) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User address not found",
      });
    }
    const userLat = parseFloat(userAddress.a_lat);
    const userLong = parseFloat(userAddress.a_long);
    const distanceQuery = `
      (6371 * acos(
        cos(radians(${userLat})) *
        cos(radians(CAST(lats AS DOUBLE))) *
        cos(radians(CAST(longs AS DOUBLE)) - radians(${userLong})) +
        sin(radians(${userLat})) *
        sin(radians(CAST(lats AS DOUBLE)))
      ))`;

    const stores = await Store.findAll({
      where: sequelize.literal(`${distanceQuery} <= 10`),
    });
    if (stores.length === 0) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "No stores found within 10km range",
      });
    }

    const storeIds = stores.map((store) => store.id);

    const products = await Product.findAll({
      where: { store_id: { [Op.in]: storeIds } },
    });

    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Error fetching nearby products:", error);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
};

// Fetch user orders irrespective of status
const getMyInstantOrders = async (req, res) => {
  const uid = req.user.userId;
  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized: User not found!",
    });
  }

  try {
    const orders = await NormalOrder.findAll({
      where: { uid: uid },
      include: [
        {
          model: NormalOrderProduct,
          as: "NormalProducts",
          attributes: [
            "id",
            "oid",
            "product_id",
            "weight_id",
            "pquantity",
            "price",
          ],
          include: [
            {
              model: WeightOption,
              as: "productWeight",
              attributes: [
                "id",
                "normal_price",
                "subscribe_price",
                "mrp_price",
                "weight",
              ],
              required: false,
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["id", "title", "img", "description"],
                  required: false,
                },
              ],
            },
            {
              model: Product,
              as: "ProductDetails",
              attributes: ["id", "title", "img", "description"],
              include: [
                {
                  model: ProductReview,
                  as: "ProductReviews",
                  attributes: ["id", "rating", "review", "user_id", "order_id"],
                  where: {
                    user_id: uid,
                    order_id: {
                      [Op.eq]: sequelize.col("NormalOrder.id"),
                    },
                  },
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: Address,
          as: "instOrdAddress",
        },
        {
          model: Time,
          as: "timeslot",
          attributes: ["id", "mintime", "maxtime"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
      offset: parseInt(req.query.offset) || 0,
      logging: console.log,
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "No orders found for this user",
      });
    }

    const ordersWithReviews = orders.map(order => {
      const orderData = order.toJSON();
      const hasReviews = orderData.NormalProducts.some(product => 
        product.ProductDetails?.ProductReviews?.length > 0
      );
      return {
        ...orderData,
        hasReviews,
      };
    });

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Orders fetched successfully",
      orders:ordersWithReviews,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error.stack);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
      stack: error.stack,
    });
  }
};

const couponList = async(req,res)=>{
  const uid = req.user.userId;
  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized: User not found!",
    });
  }

  try {
    const coupons = await Coupon.findAll({
      where: {
        status: 1,
        end_date: {
          [Op.gte]: new Date(),
        },
      },
      attributes: ['id', 'coupon_title', 'coupon_val', 'min_amt', 'end_date'],
    });
    if (!coupons || coupons.length === 0) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "No active coupons found",
      });
    }
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Coupons fetched successfully",
      coupons,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
}

// we can pass the previous orderId, so that ordered products will be added to cart if the the same products with weight options are available in cart then its quantity will be updated 
const addPreviousOrderToCart = async(req,res)=>{
  const uid = req.user.userId;
  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized: User not found!",
    });
  }
  const {previousOrderId}=req.body;
  if (!previousOrderId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Previous order ID is required",
    });
  }
  try {
    const previousOrder = await NormalOrder.findOne({
      where:{id:previousOrderId,uid:uid},
      include:[
        {
          model:NormalOrderProduct,
          as:"NormalProducts",
          attributes:["id","product_id","weight_id","pquantity"],
          include:[
            {
              model:WeightOption,
              as:"productWeight",
              attributes:["id","weight"],
            },
            {
              model:Product,
              as:"ProductDetails",
              attributes:["id","title","img"],
            }
          ]
        }
      ]
    })
    if (!previousOrder) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Previous order not found",
      });
    }
    const previousProducts = previousOrder.NormalProducts.map(item => ({
      product_id: item.product_id,
      weight_id: item.weight_id,
      quantity: item.pquantity,
      orderType: "Normal"
    }));
    if (previousProducts.length === 0) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "No products found in the previous order",
      });
    }
    // Check if products already exist in the cart
    const existingCartItems = await Cart.findAll({
      where: {
        uid: uid,
        [Op.or]: previousProducts.map(item => ({
          product_id: item.product_id,
          weight_id: item.weight_id,
          orderType: "Normal"
        }))
      }
    });
    const existingCartMap = new Map();
    existingCartItems.forEach(item => {
      const key = `${item.product_id}-${item.weight_id}`;
      existingCartMap.set(key, item);
    });
    const cartItemsToAdd = [];
    for (const item of previousProducts) {
      const key = `${item.product_id}-${item.weight_id}`;
      if (existingCartMap.has(key)) {
        // If item exists, update quantity
        const existingItem = existingCartMap.get(key);
        existingItem.quantity += item.quantity;
        await existingItem.save();
      } else {
        // If item does not exist, add to cart
        cartItemsToAdd.push({
          uid: uid,
          product_id: item.product_id,
          weight_id: item.weight_id,
          quantity: item.quantity,
          orderType: "Normal"
        });
      }
    }
    if (cartItemsToAdd.length > 0) {
      await Cart.bulkCreate(cartItemsToAdd);
    }
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Previous order items added to cart successfully",
      cartItems: [...existingCartItems, ...cartItemsToAdd],
    });
  } catch (error) {
    console.error("Error adding previous order to cart:", error);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server Error",
      error: error.message,
    });
  }
}


module.exports = {
  instantOrder,
  getOrdersByStatus,
  getOrderDetails,
  cancelOrder,
  getRecommendedProducts,
  getNearByProducts,
  getMyInstantOrders,
  couponList,
  instantOrderAgain,
  addPreviousOrderToCart
};
