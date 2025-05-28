const express=require("express")
const router=express.Router();
const { upsertProduct, getAllProducts, getProductById, getProductCount, toggleproductStatus, deleteProduct } = require("../AdminControllers/Product.Controller");
const {upload,handleMulterError} = require("../utils/multerConfig");
const adminMiddleware = require("../middlewares/adminMiddleware")
router.post("/upsert",adminMiddleware.isAdmin, upload.fields([
    { name: "img", maxCount: 1 },
    { name: "extraImages", maxCount: 5 }
]),handleMulterError, upsertProduct);
router.get("/all",adminMiddleware.isAdmin,getAllProducts)
router.get("/getbyid/:id",adminMiddleware.isAdmin,getProductById)
router.delete("/delete/:id",adminMiddleware.isAdmin,deleteProduct)
router.patch("/update/:id",adminMiddleware.isAdmin,getAllProducts)
router.get("/count",adminMiddleware.isAdmin,getProductCount)
router.patch("/toggle-status",adminMiddleware.isAdmin,toggleproductStatus)



module.exports=router