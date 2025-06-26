const express = require('express');
const {instantOrder, getOrdersByStatus, getOrderDetails, cancelOrder,getRecommendedProducts,getNearByProducts,getUserOrders} = require('../../UserControllers/customer/instantOrder_controller');
const instantOrderController = require('../../UserControllers/customer/instantOrder_controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const router = express.Router();

router.post("/u_instant_order", authMiddleware.isAuthenticated, instantOrderController.instantOrder);
router.post("/u_instant_order/status",authMiddleware.isAuthenticated,instantOrderController.getOrdersByStatus);
router.get("/u_instant_order/most-frequent-tips",authMiddleware.isAuthenticated,instantOrderController.getMostFrequentDeliveryTip);
router.get("/u_instant_order/my-instant-orders",authMiddleware.isAuthenticated,instantOrderController.getMyInstantOrders);
router.get("/u_instant_order/coupon-list",authMiddleware.isAuthenticated,instantOrderController.couponList)
router.get("/u_instant_order/:id",authMiddleware.isAuthenticated,instantOrderController.getOrderDetails);
router.post("/u_instant_order/cancel",authMiddleware.isAuthenticated,instantOrderController.cancelOrder);
router.get("/u_instant_order/get-recommendedProducts",authMiddleware.isAuthenticated,instantOrderController.getRecommendedProducts)
router.get("/u_instant_order/near-by-storeProducts",authMiddleware.isAuthenticated,instantOrderController.getNearByProducts);
router.post("/u_instant_order/order-again",authMiddleware.isAuthenticated,instantOrderController.instantOrderAgain);
router.post("/u_instant_order/add-to-cart",authMiddleware.isAuthenticated,instantOrderController.addPreviousOrderToCart);
router.put("/u_instant_order/update-payment-status",authMiddleware.isAuthenticated,instantOrderController.UpdatePaymentStatus);

module.exports = router;