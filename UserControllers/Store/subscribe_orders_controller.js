const { Sequelize, Op } = require("sequelize");
const Rider = require("../../Models/Rider");
const SubscribeOrder = require("../../Models/SubscribeOrder");
const User = require("../../Models/User");
const asyncHandler = require("../../middlewares/errorHandler");
const Address = require("../../Models/Address");
const SubscribeOrderProduct = require("../../Models/SubscribeOrderProduct");
const Product = require("../../Models/Product");
const Time = require("../../Models/Time");
const Category = require("../../Models/Category");
const WeightOption = require("../../Models/WeightOption");

const FetchSubscribeOrdersByStatus = asyncHandler(async (req, res) => {
    console.log("Decoded User:", req.user);
  
    const uid = req.user.storeId;
    if (!uid) {
      return res.status(400).json({
        ResponseCode: "401",
        Result: "false",
        ResponseMsg: "User ID not provided",
      });
    }
  
    console.log("Fetching orders for user ID:", uid);
    const { store_id, status } = req.body;
  
    if (!store_id) {
      return res.status(400).json({ message: "Store ID is required!" });
    }
  
    if (!status || !["active", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        message:
          "Order status is required and should be either active, completed, or cancelled!",
      });
    }
  
    try {
      let queryFilter = { store_id };
      if (status === "active") {
        queryFilter.status = { [Op.in]: ["Pending", "Active"] };
      } else if (status === "completed") {
        queryFilter.status = "Completed";
      } else if (status === "cancelled") {
        queryFilter.status = "Cancelled";
      }
      console.log("Query Filter:", queryFilter);
  
      const orders = await SubscribeOrder.findAll({
        where: queryFilter,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model:Time,
            as:"timeslots",
            attributes:["mintime","maxtime"],
            required:false
          },
          {
            model: SubscribeOrderProduct,
            as: "orderProducts",
            include: [
              {
                model: Product,
                as: "productDetails",
                attributes: ["id", "title", "img"],
              },
            ]
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "mobile","email"],
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
  
      console.log("Orders found:", orders);
  
      if (orders.length === 0) {
        return res
          .status(404)
          .json({ message: "No orders found for the given status." });
      }
  
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Orders fetched successfully",
        Data: orders,
      });
    } catch (error) {
      console.error("Error fetching orders:", error.message);
      return res
        .status(500)
        .json({ message: "Internal server error: " + error.message });
    }
  });

  
   

  const ViewSubscribeOrderById = asyncHandler(async (req, res) => {
    console.log("Decoded User:", req.user);
  
    const uid = req.user.storeId;
    if (!uid) {
      return res.status(401).json({
        ResponseCode: "401",
        Result: "false",
        ResponseMsg: "User ID not provided",
      });
    }
  
    console.log("Fetching orders for user ID:", uid);
    const { storeId, orderId } = req.body;
  
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required!" });
    }
    if (!storeId) {
      return res.status(400).json({ message: "Store ID is required!" });
    }
  
    try {
      const order = await SubscribeOrder.findOne({
        where: { id: orderId, store_id: storeId },
        include: [
          {
            model:Time,
            as:"timeslots",
            attributes:["mintime","maxtime"],
            where:{store_id:storeId},
            required:false
          },
          {
            model: SubscribeOrderProduct,
            as: "orderProducts",
            include: [
              {
                model: Product,
                as: "productDetails",
                attributes: ["id", "title", "description","img"],
                include:[
                  {
                    model:Category,
                    as:"category",
                    attributes:['id','title']
                  },
                ]
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
  
      if (!order) {
        return res.status(404).json({ message: "Order not found!" });
      }
  
      return res.status(200).json({
        message: "Order fetched successfully!",
        Data: {
          ...order.dataValues,
          delivered_dates: safeParseJSON(order.delivered_dates),
        },
      });
    } catch (error) {
      console.error("Error fetching order by ID:", error.message);
      return res.status(500).json({ message: "Internal server error: " + error.message });
    }
  });
  
  // Safe JSON parsing function
  const safeParseJSON = (data) => {
    try {
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error parsing delivered_dates:", error.message);
      return [];
    }
  };
  


const AssignOrderToRider = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);
  const uid = req.user?.storeId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }
  console.log("Fetching orders for user ID:", uid);
  const { order_id, rider_id } = req.body;
  if (!order_id || !rider_id) {
    return res
      .status(400)
      .json({ message: "Order ID and Rider ID are required!" });
  }
  try {
    const order = await SubscribeOrder.findOne({
      where: { id: order_id, status:{[Op.in]:["Pending","Active"]} },
    });
    if (!order) {
      return res.status(404).json({ message: "Pending or Active order not found for this store!" });
    }
    const rider = await Rider.findOne({ where: { id: rider_id, status: 1 } });
    if (!rider) {
      return res.status(404).json({ message: "Rider not found! OR inactive!" });
    }

    const isReassignment = order.rid && order.rid !== rider_id;
    const previousRiderId = order.rid;
    const newStatus = order.status === "Pending" ? "Processing" : "Active";

    await SubscribeOrder.update(
      { rid: rider_id, status: newStatus },
      { where: { id: order_id } }
    );
    const updatedOrder = await SubscribeOrder.findOne({
      where: { id: order_id },
    });

    let message = "Order assigned to rider successfully!";
    if (isReassignment) {
      message = `Order reassigned from rider ${previousRiderId} to rider ${rider_id} successfully!`;
      console.log(
        `Reassignment: Order ${order_id} from rider ${previousRiderId} to ${rider_id}`
      );
    } else {
      console.log(`Assignment: Order ${order_id} to rider ${rider_id}`);
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      message: message,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error assigning order:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error: " + error.message });
  }
});

module.exports = {
  FetchSubscribeOrdersByStatus,
  ViewSubscribeOrderById,
  AssignOrderToRider,
};
