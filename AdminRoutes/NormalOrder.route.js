const express=require("express")
const router=express.Router();
const orderController=require("../AdminControllers/NormalOrder.Controller");
const adminMiddleware = require("../middlewares/adminMiddleware")
// router.post("/add",orderController.upsertorder); //1
router.get("/all/:store_id/:status",adminMiddleware.isAdmin,orderController.getAllNorOrders) //1
// router.get("/getbyid/:id",orderController.getorderById) //1
// router.delete("/delete/:id",orderController.deleteorder)
// router.get("/count",orderController.getorderCount) //1

module.exports=router