const express=require("express")
const router=express.Router();
const timeController=require("../AdminControllers/Time.Controller");
const adminMiddleware = require("../middlewares/adminMiddleware")

router.post("/upsert/:store_id",adminMiddleware.isAdmin, timeController.upsertTime); 
router.get("/all/:store_id",adminMiddleware.isAdmin,timeController.getAllTimes) //1
router.get("/getbyid/:id",adminMiddleware.isAdmin,timeController.getTimeById) //1
router.delete("/delete/:id",adminMiddleware.isAdmin,timeController.deleteTime)
router.get("/count",adminMiddleware.isAdmin,timeController.getTimeCount) //1
router.patch('/toggle-status',adminMiddleware.isAdmin,timeController.toggleTimeStatus)

module.exports=router