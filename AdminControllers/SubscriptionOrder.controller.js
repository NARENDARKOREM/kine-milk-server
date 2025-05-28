const Subscription=require("../Models/SubscribeOrder");
const {Op}=require("sequelize")
const asynHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const User = require("../Models/User");
const Rider = require("../Models/Rider");
const Time = require("../Models/Time")

const getAllSubscriptionOrdersbystoreid = async (req, res) => {
    const { store_id, status } = req.params;
  
    // Define the valid statuses
    const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled', 'On Route'];
  
    try {
      // Validate store_id
      if (!store_id) {
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "store_id is required.",
        });
      }
  
      // Validate status
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `Invalid status. Allowed statuses are: ${validStatuses.join(", ")}`,
        });
      }
  
      // Fetch orders with user details using include
      const NorOrders = await Subscription.findAll({
        where: { store_id, status },
        include: [
          {
            model: User,  // Assuming User is the correct model name
            as: "user",   // Alias must match the one defined in the relationship
            attributes: ["id", "name"], // Select only needed fields
          },
          {
            model:Rider,
            as:"subrider",
            attributes: ["id", "title"],
          },
          {
            model:Time,
            as:"timeslots",
            attributes: ["id", "mintime","maxtime"],
          }
          
        ],
      });
  
      logger.info(`Successfully fetched orders for store_id: ${store_id} with status: ${status}`);
      res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: `Fetched orders for store_id: ${store_id} with status: ${status}`,
        data: NorOrders,
      });
    } catch (error) {
      logger.error("Error fetching NormalOrders:", error);
      res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Internal server error",
        details: error.message,
      });
    }
  };

  module.exports = {getAllSubscriptionOrdersbystoreid}
  