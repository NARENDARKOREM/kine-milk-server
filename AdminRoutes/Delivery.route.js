const express=require("express")
const router=express.Router();
const DeliveryController=require("../AdminControllers/Delivery.Controller");

router.post("/upsert",DeliveryController.upsertDelivery);
router.get("/all",DeliveryController.getAllDelivery)
router.get("/getbyid/:id",DeliveryController.getDeliveryById)
router.delete("/delete/:id",DeliveryController.deleteDelivery)
router.patch("/update/:id",DeliveryController.getDeliveryById)
router.get("/count",DeliveryController.getDeliveryCount)
router.patch("/toggle-status",DeliveryController.toggleDeliveryStatus)

module.exports=router