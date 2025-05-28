const express=require("express")
const router=express.Router();
const couponController=require("../AdminControllers/Couppon.Controller");
const {upload, handleMulterError} = require("../utils/multerConfig");
const adminMiddleware = require('../middlewares/adminMiddleware');

router.post("/upsert",upload.single("coupon_img"),handleMulterError,adminMiddleware.isAdmin,couponController.upsertCoupon);
router.get("/all",adminMiddleware.isAdmin,couponController.getAllCoupon)
router.get("/getbyid/:id",adminMiddleware.isAdmin,couponController.getCouponById)
router.delete("/delete/:id",adminMiddleware.isAdmin,couponController.deleteCoupon)
// router.patch("/update/:id",couponController.upsertcoupon)
router.get("/count",adminMiddleware.isAdmin,couponController.getCouponCount)
router.patch("/toggle-status",adminMiddleware.isAdmin,couponController.toggleCouponStatus)

module.exports=router