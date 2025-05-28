const Product = require("../../Models/Product");
const NormalOrder = require("../../Models/NormalOrder");
const SubscribeOrder = require("../../Models/SubscribeOrder");
const Rider = require("../../Models/Rider");
const Store = require("../../Models/Store");
const asyncHandler = require("../../middlewares/errorHandler");
const moment = require('moment');
const { Op } = require("sequelize");
const ProductInventory = require("../../Models/ProductInventory");
const Notification = require("../../Models/Notification");

const StoreDashboardAPI = asyncHandler(async (req, res) => {
  try {
    const uid = req.user.storeId;

    if (!uid) {
      return res.status(400).json({ message: "Unauthorized! user not found." });
    }

    // Normalize the mobile format (remove country code if present)
    const formattedMobile = req.user.mobile.startsWith("+91")
      ? req.user.mobile.slice(3) // Remove +91
      : req.user.mobile;

    console.log("User mobile:", formattedMobile);

    // Find the store associated with the mobile number
    const store = await Store.findOne({ where: { mobile: formattedMobile } });

    if (!store) {
      return res.status(404).json({ message: "No store found for this user!" });
    }

    const storeId = store.id;

    const startOfDay = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    // Total Orders 
    const totalNormalOrders = await NormalOrder.count({
      where:{store_id:storeId, createdAt:{[Op.between]:[startOfDay,endOfDay]}}
    })
    const totalSubscribeOrders = await SubscribeOrder.count({
      where: { store_id: storeId, createdAt: { [Op.between]: [startOfDay, endOfDay] } },
    });
    const totalOrders = totalNormalOrders + totalSubscribeOrders;

    // Open Orders
    const openNormalOrders = await NormalOrder.count({
      where:{store_id:storeId,status:"On Route",createdAt:{[Op.between]:startOfDay,endOfDay}}
    })
    const openSubscribeOrders = await SubscribeOrder.count({
      where:{store_id:storeId,status:"Active",createdAt:{[Op.between]:[startOfDay,endOfDay]}}
    })
    const openOrders = openNormalOrders + openSubscribeOrders;

    // Closed Orders 
    const closedNormalOrders = await NormalOrder.count({
      where:{store_id:storeId,status:"Completed",createdAt:{[Op.between]:[startOfDay,endOfDay]}}
    })
    const closedSubscribeOrders = await SubscribeOrder.count({
      where:{store_id:storeId,status:"Completed",createdAt:{[Op.between]:[startOfDay,endOfDay]}}
    })
    const closedOrders = closedNormalOrders + closedSubscribeOrders;

    const products = await ProductInventory.count({ where: { store_id: storeId } });
    const deliveryBoys = await Rider.count({ where: { store_id: storeId } });
    const instantOrders = await NormalOrder.count({
      where: { store_id: storeId,status:{[Op.or]:['Pending','Processing','On Route']} },
    });
    const subscriptionOrders = await SubscribeOrder.count({
      where: { store_id: storeId, status:{[Op.or]:['Pending','Active']} },
    });

    return res.status(200).json({
      success: true,
      message: "Store dashboard data fetched successfully.",
      store_details: {
        id: store.id,
        title: store.title,
        address: store.full_address,
        mobile: store.mobile,
        status: store.status,
      },
      todays_summary: {
        total_orders: totalOrders,
        open_orders: openOrders,
        closed_orders: closedOrders,
      },
      report_data: {
        products,
        deliveryBoys,
        instantOrders,
        subscriptionOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching store dashboard data:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

const NotificationsAPI = async(req,res)=>{
  console.log("Decoded User: ",req.user)
  const uid = req.user?.userId || req.user?.riderId || req.user?.storeId;
  if(!uid){
      return res.status(401).json({
          ResponseCode:"401",
          Result:"false",
          ResponseMsg:"Unauthorized: User not found!"
      })
  }

  try {
      const notifications = await Notification.findAll({where:{uid:uid}})
      if(!notifications || notifications.length === 0){
          return res.status(400).json({message:"Notification not found!"})
      }
      return res.status(200).json({message:"Notification fetched successfully!",notifications})
  } catch (error) {
      console.error("Error fetching notifications: ",error);
      return res.status(500).json({
          message:"Internal server error"+error.message
      })
  }
}

module.exports = { StoreDashboardAPI,NotificationsAPI };
