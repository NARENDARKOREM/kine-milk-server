const { Op, Sequelize } = require("sequelize"); // Import Op for Sequelize operators
const Rider = require("../../Models/Rider");
const NormalOrder = require("../../Models/NormalOrder");
const asyncHandler = require("../../middlewares/errorHandler");
const SubscribeOrder = require("../../Models/SubscribeOrder");
const User = require("../../Models/User");
const Address = require("../../Models/Address");
const Time = require("../../Models/Time");

const DeliveryDashboard = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const riderId = req.user?.riderId;
  if (!riderId) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Rider ID not provided",
    });
  }

  try {
    console.log("Fetching rider details for ID:", riderId);

    const rider = await Rider.findOne({
      where: { id: riderId },
      attributes: ["id", "store_id", "title"],
    });

    if (!rider || !rider.store_id) {
      return res.status(401).json({
        ResponseCode: "401",
        Result: "false",
        ResponseMsg: "Rider is not assigned to any store.",
      });
    }

    const { store_id } = rider;
    console.log("Fetching orders for Store ID:", store_id);

    const [
      activeInstantOrders,
      completedInstantOrders,
      activeSubscribeOrders,
      completedSubscribeOrders,
      assignedInstantOrders,
      assignedSubscribeOrders,
    ] = await Promise.all([
      NormalOrder.count({
        where: { store_id, rid: riderId, status: "On Route" },
      }),
      NormalOrder.count({
        where: { store_id, rid: riderId, status: "Completed" },
      }),
      SubscribeOrder.count({
        where: { store_id, rid: riderId, status: "Active" },
      }),
      SubscribeOrder.count({
        where: { store_id, rid: riderId, status: "Completed" },
      }),
      NormalOrder.findAll({
        where: {
          store_id,
          rid: riderId,
          status: { [Op.or]: ["On Route", "Processing"] },
        },
        include: [
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
          {
            model: Time,
            as: "timeslot",
            attributes: ["id", "minTime", "maxTime"],
          },
        ],
      }),
      SubscribeOrder.findAll({
        where: {
          store_id,
          rid: riderId,
          status: { [Op.or]: ["Processing", "Active"] },
        },
        include: [
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
          {
            model: Time,
            as: "timeslots",
            attributes: ["id", "minTime", "maxTime"],
          },
        ],
      }),
    ]);

    const formattedInstantOrders = assignedInstantOrders.map(order => ({
      ...order.toJSON(),
      orderType: "NormalOrder",
    }));
    const formattedSubscribeOrders = assignedSubscribeOrders.map(order => ({
      ...order.toJSON(),
      orderType: "SubscribeOrder",
    }));

    const activeOrders = activeInstantOrders + activeSubscribeOrders;
    const completedOrders = completedInstantOrders + completedSubscribeOrders;
    // const orderDetails = [...assignedInstantOrders, ...assignedSubscribeOrders];
    const orderDetails = [...formattedInstantOrders,...formattedSubscribeOrders]

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Delivery Dashboard Fetched Successfully",
      rider,
      activeOrders,
      completedOrders,
      order_details: orderDetails,
    });
  } catch (error) {
    console.error("Error Fetching Delivery Dashboard:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

module.exports = { DeliveryDashboard };
