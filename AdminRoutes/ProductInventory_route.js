const express = require('express');
const ProductInventory = require('../AdminControllers/ProductInventory_controller');
const {upload,handleMulterError} = require('../utils/multerConfig');
const adminMiddleware = require("../middlewares/adminMiddleware")
const router = express.Router();



router.post("/upsert",adminMiddleware.isAdmin,ProductInventory.upsertInventory);

router.post("/upsert-productinv",adminMiddleware.isAdmin,upload.none(),handleMulterError,ProductInventory.upsertInventory);
router.get("/getproductinv/:id",ProductInventory.getProductInventoryById);
router.get("/getallproductinv",ProductInventory.ProductInventoryList)
router.patch("/toggle-status/",adminMiddleware.isAdmin,ProductInventory.toggleProductInventoryStatus)
router.delete("/delete/:id",ProductInventory.deleteProductInventory)
router.get("/getproductbystore/:store_id",ProductInventory.getProductsbyStore)
router.delete("/delete-weight-options",adminMiddleware.isAdmin,ProductInventory.deleteInventoryStoreWeightOptions)

module.exports = router;