const express=require("express")
const router=express.Router();
const ProductAtrributeController=require("../AdminControllers/ProductAtrribute.Controller");
const adminMiddleware = require('../middlewares/adminMiddleware');

router.post("/upsert",adminMiddleware.authMiddleware,ProductAtrributeController.upsertProductAttribute);
router.get("/all",ProductAtrributeController.getAllProductAttribute)
router.get("/getbyid/:id",ProductAtrributeController.getProductAttributeById)
router.delete("/delete/:id",adminMiddleware.authMiddleware,ProductAtrributeController.deleteProductAttribute)
router.patch("/update/:id",adminMiddleware.authMiddleware,ProductAtrributeController.getProductAttributeById)
router.get("/count",adminMiddleware.authMiddleware,ProductAtrributeController.getProductAttributeCount)
router.patch("/toggle-status",adminMiddleware.authMiddleware,ProductAtrributeController.toggleproductAttributeStatus)

module.exports=router