
const express=require("express")
const router=express.Router()
const deliveryTrackingController=require("../../UserControllers/Delivery/deliver_tracking_controller")

router.post("/update-location",deliveryTrackingController.deliveryLocationUpdate)
module.exports=router