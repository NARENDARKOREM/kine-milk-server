const { Op } = require("sequelize");
const asyncHandler = require("../../middlewares/errorHandler");
const Product = require("../../Models/Product");
const Rider = require("../../Models/Rider");
const SubscribeOrder = require("../../Models/SubscribeOrder");
const SubscribeOrderProduct = require("../../Models/SubscribeOrderProduct");
const User = require("../../Models/User");
const Address = require("../../Models/Address");
const Notification = require("../../Models/Notification");
const WeightOption = require("../../Models/WeightOption");
const axios = require("axios"); 


const FetchAllSubscribeOrders = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);
  const riderId = req.user?.riderId;
  const { status } = req.query;
  if (!riderId) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Rider ID not provided",
    });
  }
  if (!status || !["active", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({
      message:
        "Order status is required and should be either active, completed, or cancelled!",
    });
  }
  try {
    let queryFilter = { rid: riderId };
    if (status === "active") {
      queryFilter.status = { [Op.or]: ["Active"] };
    } else if (status === "completed") {
      queryFilter.status = "Completed";
    } else if (status === "cancelled") {
      queryFilter.status = "Cancelled";
    }

    console.log("Fetching rider details for ID:", riderId);
    const rider = await Rider.findOne({
      where: { id: riderId },
      attributes: ["store_id", "id", "title"],
    });
    if (!rider || !rider.store_id) {
      return res
        .status(404)
        .json({ message: "Rider not assigned to any store!" });
    }
    const store_id = rider.store_id;
    console.log(
      `Fetching orders for Store ID: ${store_id} with Status: ${status}`
    );
    const subscribeOrders = await SubscribeOrder.findAll({
      where: { store_id, rid: riderId, status },
      include: [
        {
          model: SubscribeOrderProduct,
          as: "orderProducts",
          include: [
            {
              model: Product,
              as: "productDetails",
              attributes: [
                "id",
                "title",
                "description",
              ],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "mobile", "email"],
          include: [
            {
              model: Address,
              as: "addresses",
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
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    if (!subscribeOrders.length) {
      return res
        .status(404)
        .json({ message: "No Orders found with the given status!" });
    }
    return res.status(200).json({
      message: "Subscribe Orders Fetched Successfully!",
      orders: subscribeOrders,
    });
  } catch (error) {
    console.error("Error Occurs While Fetching Subscribe Orders: ", error);
    return res.status(500).json({ message: "Interal Server Error", error });
  }
});

const ViewSubscribeOrderDetails = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);
  const riderId = req.user?.riderId;
  const { orderId } = req.query;

  if (!riderId) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Rider ID not provided",
    });
  }

  if (!orderId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Order Id is required!",
    });
  }
  try {
    console.log(
      "Fetching order details for Order ID:",
      orderId,
      " and Rider ID:",
      riderId
    );
    const subscribeOrders = await SubscribeOrder.findOne({
      where: { id: orderId, rid: riderId },
      include: [
        {
          model: SubscribeOrderProduct,
          as: "orderProducts",
          include: [
            {
              model: Product,
              as: "productDetails",
              attributes: ["id", "title", "description", "img"],
            },
            {
              model:WeightOption,
              as:"subscribeProductWeight",
              attributes:["id","weight","subscribe_price","normal_price","mrp_price"]
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "mobile", "email"],
          include: [
            {
              model: Address,
              as: "addresses",
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
            },
          ],
        },
      ],
    });
    if (!subscribeOrders) {
      return res.status(404).json({
        success: false,
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order not found or not assigned to this rider!",
      });
    }

    console.log("Raw delivered_dates:", subscribeOrders.delivered_dates);
    console.log("Type of delivered_dates:", typeof subscribeOrders.delivered_dates);

    const deliveredDates = Array.isArray(subscribeOrders.delivered_dates)
    ? subscribeOrders.delivered_dates
    : [];

    return res.status(200).json({
      success: true,
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Subscribe Order details fetched successfully",
      Data: {
        ...subscribeOrders.dataValues,
        delivered_dates: deliveredDates,
      },
    });;
  } catch (error) {
    console.error("Error Occurs While Fetching Order Details: ", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      Error: error.message,
    });
  }
});

const CompleteSubscriptionOrder = asyncHandler(async (req, res) => {
  try {
    const { orderId, deliveryDate } = req.body;

    if (!orderId || !deliveryDate) {
      return res.status(400).json({
        success: false,
        ResponseCode: "400",
        ResponseMsg: "Order ID and delivery date are required",
      });
    }

    // Fetch existing order
    const order = await SubscribeOrder.findOne({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({
        success: false,
        ResponseCode: "404",
        ResponseMsg: "Order not found",
      });
    }

    let deliveredDates = order.delivered_dates || [];

    // Convert to array if it's stored as a string (MySQL TEXT issue)
    if (typeof deliveredDates === "string") {
      deliveredDates = JSON.parse(deliveredDates);
    }

    // Append new delivery date if it doesn't already exist
    if (!deliveredDates.includes(deliveryDate)) {
      deliveredDates.push(deliveryDate);
    }

    // Update the order
    await SubscribeOrder.update(
      { delivered_dates: JSON.stringify(deliveredDates) }, // Store as JSON string
      { where: { id: orderId } }
    );

    return res.status(200).json({
      success: true,
      ResponseCode: "200",
      ResponseMsg: "Order updated successfully",
      Data: { ...order.dataValues, delivered_dates: deliveredDates },
    });
  } catch (error) {
    console.error("Error updating delivered dates:", error);
    return res.status(500).json({
      success: false,
      ResponseCode: "500",
      ResponseMsg: "Internal Server Error",
      Error: error.message,
    });
  }
});

const AcceptSubscriptionOrder = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const riderId = req.user?.riderId;
  if (!riderId) {
    return res.status(400).json({
      success: false,
      message: "Rider ID not found in token",
    });
  }
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required!",
    });
  }
  try {
    const order = await SubscribeOrder.findOne({
      where: { id: orderId, rid: riderId, status:{[Op.in]:[ "Processing","Active"]} },
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found, not assigned to you, or already processed!",
      });
    }

    if (order.status === "Active") {
      return res.status(200).json({
        success: true,
        ResponseCode: "200",
        ResponseMsg: "Order is already accepted and active!",
        order,
      });
    }

    const user = await User.findByPk(order.uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found for this order!",
      });
    }

    await SubscribeOrder.update(
      { status: "Active" },
      { where: { id: orderId } }
    );

    const updatedOrder = await SubscribeOrder.findOne({
      where: { id: orderId },
    });

    try {
      const userNotificationContent = {
        app_id: process.env.ONESIGNAL_CUSTOMER_APP_ID,
        include_player_ids: [user.one_subscription],
        data: { user_id: user.id, type: "order accepted" },
        contents: {
          en: `${user.name}, Your order (ID: ${updatedOrder.order_id}) is now on the way!`,
        },
        headings: { en: "Order On Route" },
      };

      const userResponse = await axios.post(
        "https://onesignal.com/api/v1/notifications",
        userNotificationContent,
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Basic ${process.env.ONESIGNAL_CUSTOMER_API_KEY}`,
          },
        }
      );
      console.log(userResponse.data, "user notification sent");
    } catch (error) {
      console.log("User notification error:", error);
    }

    await Promise.all([
      Notification.create({
        uid: user.id,
        datetime: new Date(),
        title: "Order On Route",
        description: `Your order (ID: ${updatedOrder.order_id}) has been accepted and is on the way!`,
      }),
      Notification.create({
        uid: order.store_id,
        datetime: new Date(),
        title: "Order Accepted by Rider",
        description: `Order (ID: ${updatedOrder.order_id}) has been accepted by the rider and is on the way.`,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully! Status updated to 'Active'.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error accepting order:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
});

module.exports = {
  FetchAllSubscribeOrders,
  ViewSubscribeOrderDetails,
  CompleteSubscriptionOrder,
  AcceptSubscriptionOrder,
};
