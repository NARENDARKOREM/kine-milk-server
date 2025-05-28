const express=require("express")
const router=express.Router();
const faqController=require("../AdminControllers/Rider.Controller");
const {upload,handleMulterError} = require("../utils/multerConfig");
const adminMiddleware = require("../middlewares/adminMiddleware")

router.post("/upsert",adminMiddleware.isAdmin,upload.single('img'),handleMulterError, faqController.upsertRider); 
router.get("/all/:store_id",adminMiddleware.isAdmin,faqController.getAllRidersbyStoreid) //1
router.get("/all",adminMiddleware.isAdmin,faqController.getAllRiders) //1
router.get("/getbyid/:id",adminMiddleware.isAdmin,faqController.getRiderById) //1
router.delete("/delete/:id",adminMiddleware.isAdmin,faqController.deleteRider)
router.get("/count",adminMiddleware.isAdmin,faqController.getRiderCount) //1
router.patch("/toggle-status",adminMiddleware.isAdmin,faqController.toggleRiderStatus) //1

module.exports=router