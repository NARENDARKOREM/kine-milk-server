const { Op, Sequelize } = require("sequelize");
const Address = require("../../Models/Address");
const NormalOrder = require("../../Models/NormalOrder");
const NormalOrderProduct = require("../../Models/NormalOrderProduct");
const Product = require("../../Models/Product");
const Rider = require("../../Models/Rider"); // Import Rider model
const User = require("../../Models/User");
const asyncHandler = require("../../middlewares/errorHandler");
const Notification = require("../../Models/Notification");
const SubscribeOrder = require("../../Models/SubscribeOrder");
const SubscribeOrderProduct = require("../../Models/SubscribeOrderProduct");
const WeightOption = require("../../Models/WeightOption");
const axios = require("axios"); 
const Store = require("../../Models/Store");


// const FetchAllInstantDeliveryOrdersByStatus = asyncHandler(async (req, res) => {
//     console.log("Decoded User:", req.user);
  
//     const riderId = req.user?.riderId;
//     const { status } = req.query;
  
//     if (!riderId) {
//       return res.status(401).json({
//         ResponseCode: "401",
//         Result: "false",
//         ResponseMsg: "Rider ID not provided",
//       });
//     }
  
//     if (!status || !["active", "completed", "cancelled"].includes(status)) {
//       return res.status(400).json({
//         message:
//           "Order status is required and should be either active, completed, or cancelled!",
//       });
//     }
  
//     try {
//       console.log("Fetching rider details for ID:", riderId);
  
//       // Fetch rider details to get store_id
//       const rider = await Rider.findOne({
//         where: { id: riderId },
//         attributes: ["store_id", "id", "title"],
//       });
  
//       if (!rider || !rider.store_id) {
//         return res.status(404).json({ message: "Rider not assigned to any store!" });
//       }
  
//       const store_id = rider.store_id;
//       console.log(`Fetching orders for Store ID: ${store_id} with Status: ${status}`);
  
//       // Build the query filter dynamically
//       let queryFilter = { store_id, rid: riderId };
//       if (status === "active") {
//         queryFilter.status = { [Op.in]: ["Pending", "Processing", "On Route"] };
//       } else if (status === "completed") {
//         queryFilter.status = "Completed";
//       } else if (status === "cancelled") {
//         queryFilter.status = "Cancelled";
//       }
//       console.log("Query Filter:", queryFilter);
  
//       // Fetch orders assigned to the rider using the constructed filter
//       const instantOrders = await NormalOrder.findAll({
//         where: queryFilter,
//         order: [["createdAt", "DESC"]],
//         include: [
//           {
//             model: NormalOrderProduct,
//             as: "NormalProducts",
//             include: [
//               {
//                 model: Product,
//                 as: "ProductDetails",
//                 attributes: [
//                   "id",
//                   "title",
//                   "description",
//                   "normal_price",
//                   "mrp_price",
//                   "img",
//                   "weight"
//                 ],
//               },
//             ],
//           },
//           {
//             model: User,
//             as: "user",
//             attributes: ["id", "name", "email", "mobile"],
//             on: { "$user.id$": { [Op.eq]: Sequelize.col("NormalOrder.uid") } },
//             include: [
//               {
//                 model: Address,
//                 as: "addresses",
//                 attributes: [
//                   "id",
//                   "uid",
//                   "address",
//                   "landmark",
//                   "r_instruction",
//                   "a_type",
//                   "a_lat",
//                   "a_long",
//                 ],
//               },
//             ],
//           },
//         ],
//       });
  
//       if (!instantOrders.length) {
//         return res.status(404).json({ message: "No orders found with the given status!" });
//       }
  
//       return res.status(200).json({
//         message: "Orders Fetched Successfully!",
//         orders: instantOrders,
//       });
//     } catch (error) {
//       console.error("Error Occurs While Fetching ", error);
//       return res.status(500).json({ message: "Internal Server Error", error });
//     }
//   });

const FetchAllInstantDeliveryOrdersByStatus = asyncHandler(async (req, res) => {
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
      ResponseCode: "400",
      Result: "false",
      ResponseMsg:
        "Order status is required and should be either active, completed, or cancelled!",
    });
  }

  try {
    console.log("Fetching rider details for ID:", riderId);

    const rider = await Rider.findOne({
      where: { id: riderId },
      attributes: ["store_id", "id", "title"],
    });

    if (!rider || !rider.store_id) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Rider not assigned to any store!",
      });
    }

    const store_id = rider.store_id;
    console.log(`Fetching orders for Store ID: ${store_id} with Status: ${status}`);

    let normalOrderStatusFilter;
    let subscribeOrderStatusFilter;

    if (status === "active") {
      normalOrderStatusFilter = { [Op.in]: ["Processing", "On Route"] };
      subscribeOrderStatusFilter = { [Op.in]: ["Processing", "Active"] };
    } else if (status === "completed") {
      normalOrderStatusFilter = "Completed";
      subscribeOrderStatusFilter = "Completed";
    } else if (status === "cancelled") {
      normalOrderStatusFilter = "Cancelled";
      subscribeOrderStatusFilter = "Cancelled";
    }

    const userInclude = {
      model: User,
      as: "user",
      attributes: ["id", "name", "email", "mobile"],
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
    };

    const productInclude = (orderProductModel, alias) => ({
      model: orderProductModel,
      as: alias,
      include: [
        {
          model: Product,
          as: alias === "NormalProducts" ? "ProductDetails" : "productDetails",
          attributes: ["id", "title", "description", "img"],
        },
      ],
    });

    const instantOrders = await NormalOrder.findAll({
      where: {
        store_id,
        rid: riderId,
        status: normalOrderStatusFilter,
      },
      order: [["updatedAt", "DESC"]], // Sort by assignment time
      include: [
        productInclude(NormalOrderProduct, "NormalProducts"),
        {
          ...userInclude,
          on: { "$user.id$": { [Op.eq]: Sequelize.col("NormalOrder.uid") } },
        },
      ],
    });

    const subscriptionOrders = await SubscribeOrder.findAll({
      where: {
        store_id,
        rid: riderId,
        status: subscribeOrderStatusFilter,
      },
      order: [["updatedAt", "DESC"]], // Sort by assignment time
      include: [
        productInclude(SubscribeOrderProduct, "orderProducts"),
        {
          ...userInclude,
          on: { "$user.id$": { [Op.eq]: Sequelize.col("SubscribeOrder.uid") } },
        },
      ],
    });

    const formattedInstantOrders = instantOrders.map((order) => ({
      ...order.toJSON(),
      orderType: "NormalOrder",
    }));

    const formattedSubscribeOrders = subscriptionOrders.map((order) => ({
      ...order.toJSON(),
      orderType: "SubscribeOrder",
    }));

    // Combine and sort by updatedAt DESC
    const allOrders = [...formattedInstantOrders, ...formattedSubscribeOrders].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    if (!allOrders.length) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "No orders found with the given status!",
      });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Orders Fetched Successfully!",
      orders: allOrders,
    });
  } catch (error) {
    console.error("Error Occurs While Fetching:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: error.message,
    });
  }
});

const AcceptInstantOrders = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const riderId = req.user?.riderId;
  if (!riderId) {
    return res.status(400).json({
      success: false,
      message: "Rider ID not found in token",
    });
  }

  const { order_id } = req.body;
  if (!order_id) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required!",
    });
  }

  try {
    const order = await NormalOrder.findOne({
      where: { id: order_id, rid: riderId, status: "Processing" },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or already processed!",
      });
    }

    const user = await User.findByPk(order.uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found for this order!",
      });
    }

    const store = await Store.findByPk(order.store_id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found for this order!",
      });
    }

    await NormalOrder.update(
      { status: "On Route" },
      { where: { id: order_id } }
    );

    const updatedOrder = await NormalOrder.findOne({ where: { id: order_id } });

    // Send push notification to user if one_subscription exists
    if (user.one_subscription) {
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

        if (userResponse.data.errors) {
          throw new Error(userResponse.data.errors[0]);
        }
        console.log("User notification sent successfully:", userResponse.data);
      } catch (error) {
        const errorMsg = error.response?.data?.errors?.[0] || error.message;
        console.error(`Failed to send notification to user ${user.id}: ${errorMsg}`);
      }
    } else {
      console.warn(`User ${user.id} has no OneSignal subscription ID`);
    }

    // Send push notification to store if one_subscription exists
    if (store.one_subscription) {
      try {
        const storeNotificationContent = {
          app_id: process.env.ONESIGNAL_STORE_APP_ID,
          include_player_ids: [store.one_subscription],
          data: { store_id: store.id, type: "order accepted by rider" },
          contents: {
            en: `Order (ID: ${updatedOrder.order_id}) has been accepted by the rider and is on the way.`,
          },
          headings: { en: "Order Accepted" },
        };

        const storeResponse = await axios.post(
          "https://onesignal.com/api/v1/notifications",
          storeNotificationContent,
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              Authorization: `Basic ${process.env.ONESIGNAL_STORE_API_KEY}`,
            },
          }
        );

        if (storeResponse.data.errors) {
          throw new Error(storeResponse.data.errors[0]);
        }
        console.log("Store notification sent successfully:", storeResponse.data);
      } catch (error) {
        const errorMsg = error.response?.data?.errors?.[0] || error.message;
        console.error(`Failed to send notification to store ${store.id}: ${errorMsg}`);
      }
    } else {
      console.warn(`Store ${store.id} has no OneSignal subscription ID`);
    }

    // Create notification records
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
      message: "Order accepted successfully! Status updated to 'On Route'.",
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

const ViewOrderDetails = asyncHandler(async (req, res) => {
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

    // Fetch order details along with product details
    const order = await NormalOrder.findOne({
      where: { id: orderId, rid: riderId },
      include: [
        {
          model: NormalOrderProduct,
          as: "NormalProducts",
          include: [
            {
              model: Product,
              as: "ProductDetails",
              attributes: [
                "id",
                "title",
                "description",
                "img",
              ],
            },
            {
              model:WeightOption,
              as:"productWeight",
              attributes:["id","weight","subscribe_price","normal_price","mrp_price"]
            }
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "mobile"],
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

    if (!order) {
      return res.status(404).json({
        success: false,
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Order not found or not assigned to this rider!",
      });
    }

    return res.status(200).json({
      success: true,
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Order details fetched successfully",
      Data: order,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      Error: error.message,
    });
  }
});

module.exports = {
    FetchAllInstantDeliveryOrdersByStatus,
  ViewOrderDetails,
  AcceptInstantOrders,
};
