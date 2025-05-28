const express=require("express")
const router=express.Router();
const ProductImagesController=require("../AdminControllers/ProductImages.Controller");
const {upload,handleMulterError} = require("../utils/multerConfig");
const adminMiddleware = require("../middlewares/adminMiddleware")

// router.post("/add",upload.single("category_iamge"),ProductImagesController.upsertCategory);
router.get("/all",adminMiddleware.isAdmin,ProductImagesController.getAllProductImages)
router.patch("/toggle-status",adminMiddleware.isAdmin,ProductImagesController.toggleProductImageStatus)
router.get("/getbyid/:id",adminMiddleware.isAdmin,ProductImagesController.getProductImagesById)
router.delete("/delete/:id",adminMiddleware.isAdmin,ProductImagesController.deleteProductImages)
router.patch("/update/:id",adminMiddleware.isAdmin,ProductImagesController.getProductImagesById)
router.get("/count",adminMiddleware.isAdmin,ProductImagesController.getProductImagesCount)
router.post("/imgupsert",adminMiddleware.isAdmin, upload.fields([{name:'img',maxCount:10}]),handleMulterError,ProductImagesController.upsertProductImages)

module.exports=router