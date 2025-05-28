const NormalOrder = require("../../Models/NormalOrder"); 
const Rider = require("../../Models/Rider");
const asyncHandler = require("../../middlewares/errorHandler");
const uploadToS3 = require("../../config/fileUpload.aws");
const SubscribeOrder = require("../../Models/SubscribeOrder");

const OrderDelivered = asyncHandler(async (req, res) => {
    console.log("Decoded User:", req.user);
    const riderId = req.user?.riderId;
    const { orderId } = req.query;
    const {feedback}=req.body
  
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
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "At least one delivery image is required!",
      });
    }
    
    try {
      const uploadedImages = [];
      for (const file of req.files) {
        console.log("Uploading file:", file.originalname);
        const result = await uploadToS3(file, "delivery-images");
        console.log("S3 upload result:", result);
        
        let imageUrl;
        if (typeof result === "string") {
          imageUrl = result;
        } else if (result && result.url) {
          imageUrl = result.url;
        } else {
          return res.status(500).json({
            ResponseCode: "500",
            Result: "false",
            ResponseMsg: "Error uploading image to S3",
          });
        }
        
        uploadedImages.push(imageUrl);
      }
      
      const order = await NormalOrder.findOne({
        where: { id: orderId, rid: riderId, status: "On Route" },
      });
      
      if (!order) {
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Order not found.",
        });
      }
      
      order.status = "Completed";
      order.delivery_images = uploadedImages; 
      order.feedback = feedback;
      await order.save();
      
      return res.status(200).json({
        ResponseCode: "200",
        Result: "200",
        ResponseMsg: "Order delivered successfully!",
        data: order,
      });
    } catch (error) {
      console.error("Error updating order:", error.message);
      return res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Internal Server Error: " + error.message,
      });
    }
  });
  
  const SubscriptionOrderDelivered = asyncHandler(async(req,res)=>{
    console.log("Decoded User:", req.user);
    const riderId = req.user?.riderId;
    const { orderId } = req.query;
    const {feedback}=req.body
  
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
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "At least one delivery image is required!",
      });
    }
    try {
      const uploadedImages = [];
      for (const file of req.files){
        console.log("Uploading file:",file.originalname)
        const result = await uploadToS3(file,"delivery-images");
        console.log("S3 upload result:",result)

        let imageUrl;
        if(typeof result === "string"){
          imageUrl = result;
        }else if(result && result.url){
          imageUrl = result.url
        }else{
          return res.status(500).json({
            ResponseCode: "500",
            Result: "false",
            ResponseMsg: "Error uploading image to S3",
          });
        }
        uploadedImages.push(imageUrl);
      }

      const order = await SubscribeOrder.findOne({
        where:{
          id:orderId,
          rid:riderId,
          status:"Active"
        }
      })
      if(!order){
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Order not found.",
        });
      }
      order.delivery_images = uploadedImages,
      order.feedback = feedback,
      await order.save();

      return res.status(200).json({
        ResponseCode: "200",
        Result: "200",
        ResponseMsg: "Order delivered successfully!",
        data:{
          ...order.dataValues,
          delivered_dates:JSON.parse(order.delivered_dates)
        },
      });
    } catch (error) {
       console.error("Error updating order:", error.message);
      return res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Internal Server Error: " + error.message,
      });
    }
  })

module.exports = { OrderDelivered,SubscriptionOrderDelivered };
