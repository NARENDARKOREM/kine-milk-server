const express = require('express');
const router = express.Router();
const storeInventoryController= require('../../UserControllers/Store/store_inventory_controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get("/all/:storeId",authMiddleware.isAuthenticated,storeInventoryController.ListInventory);
router.patch("/edit/:storeId",authMiddleware.isAuthenticated,storeInventoryController.AddInventory);
router.post("/view-inventory-product",authMiddleware.isAuthenticated,storeInventoryController.ViewProductInventoryById);
router.delete("/delete-inventory-product/:productId",authMiddleware.isAuthenticated,storeInventoryController.DeleteInventory)

module.exports = router;