const Address = require("../../Models/Address");
const NormalOrder = require("../../Models/NormalOrder");
const User = require("../../Models/User");
const asyncHandler = require("../../middlewares/errorHandler");

const FetchInstantOrders = asyncHandler(async (req, res) => {
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
  const { storeId } = req.params;

  if (!storeId) {
    return res.status(400).json({ message: "Store ID is required." });
  }

  try {
    const normalOrdersHistory = await NormalOrder.findAll({
      where: {
        store_id: storeId,
        status: ["Pending", "Processing", "Completed", "Cancelled", "On Route"],
      },
      attributes: [
        "id",
        "odate",
        "p_method_id",
        "address_id",
        "subtotal",
        "trans_id",
        "status",
        "o_type",
      ],
      include: [
        {
          model: User,
          attributes: ["id", "name", "mobile", "email"],
          as: "user",
        },
      ],
    });

    if (normalOrdersHistory.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this store." });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      message: "Orders fetched successfully.",
      orders: normalOrdersHistory,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});

const ViewOrderDetails = asyncHandler(async(req, res)=>{
  console.log("Decoded User:", req.user);

  const uid = req.user.storeId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }
  const {orderId,storeId}=req.body;
  if(!orderId){
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Order ID not provided",
    });
  }
  console.log("Fetching orders for user ID:", uid);
  try {
    const order = await NormalOrder.findOne({
      where:{id:orderId,store_id:storeId},
      include:[
        {
          model:User,
          attributes:["id","name","mobile","email"],
          as:"user",
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
        }
      ]
    })
    if(!order){
      return res.status(404).json({
        ResponseCode:"404",
        Result:"false",
        ResponseMsg:"Order not found",
      })
    }
    return res.status(200).json({
      ResponseCode:"200",
      Result:"true",
      ResponseMsg:"Order fetched successfully",
      data:order
    })
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
})

module.exports = { FetchInstantOrders,ViewOrderDetails };
