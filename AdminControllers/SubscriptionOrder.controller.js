const Subscription=require("../Models/SubscribeOrder");
const SubscriptionOrderProduct = require("../Models/SubscribeOrderProduct")
const {Op}=require("sequelize")
const asynHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const User = require("../Models/User");
const Rider = require("../Models/Rider");
const Time = require("../Models/Time")

const getAllSubscriptionOrdersbystoreid = async (req, res) => {
  const { store_id, status } = req?.params;

  const validStatuses = ["Pending", "Success", "Completed", "Cancelled", "On Route"];

  try {
    // Validate store_id
    if (!store_id) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "Error",
        ResponseMsg: "store_id is required.",
      });
    }

    // Validate status
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "Error",
        ResponseMsg: `Invalid status. Allowed statuses are: ${validStatuses.join(", ")}`,
      });
    }

    // Fetch orders with associated data
    const NorOrders = await Subscription.findAll({
      where: { store_id, status },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
        {
          model: Rider,
          as: "subrider",
          attributes: ["id", "title"],
          required: false, // Optional: Include even if no rider is assigned
        },
        {
          model: SubscriptionOrderProduct,
          as: "orderProducts", // Alias for SubscriptionOrderProduct
          required: false, // Include even if no products
          include: [
            {
              model: Time,
              as: "timeslotss",
              attributes: ["id", "mintime", "maxtime"],
              required: false, // Include even if no time slot
            },
          ],
        },
      ],
    });

    logger.info(`Successfully fetched orders for store_id: ${store_id} with status: ${status}`);
    res.status(200).json({
      ResponseCode: "Success",
      Result: "Success",
      responseMsg: `Fetched orders for store_id: ${store_id} with status: ${status}`,
      data: NorOrders,
    });
  } catch (error) {
    logger.error("Error fetching orders:", error);
    res.status(500).json({
      ResponseCode: "500",
      Result: "Error",
      ResponseMsg: "Internal server error",
      description: error.message,
    });
  }
};
  module.exports = {getAllSubscriptionOrdersbystoreid}
  