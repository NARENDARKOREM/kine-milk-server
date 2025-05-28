const express = require('express');
const router = express.Router();
const storeInstantOrders = require('../../UserControllers/Store/store_instant_orders_controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get("/all/:storeId",authMiddleware.isAuthenticated,storeInstantOrders.ListAllInstantOrders);
router.post("/assign-order",authMiddleware.isAuthenticated,storeInstantOrders.AssignOrderToRider);
router.post("/order-status",authMiddleware.isAuthenticated,storeInstantOrders.FetchAllInstantOrdersByStatus);
router.post("/view-order",authMiddleware.isAuthenticated,storeInstantOrders.ViewInstantOrderById);
router.get("/get-recommendedProducts",authMiddleware.isAuthenticated,storeInstantOrders.getRecommendedProducts);
router.get("/near-by-store-products",authMiddleware.isAuthenticated,storeInstantOrders.getNearByProducts)

module.exports = router;