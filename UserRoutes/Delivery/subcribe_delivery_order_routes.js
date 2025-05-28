const express = require('express');
const router = express.Router();
const subscribeDeliveryOrderController = require('../../UserControllers/Delivery/subscribe_delivery_orders_controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get("/subscribe-orders",authMiddleware.isAuthenticated,subscribeDeliveryOrderController.FetchAllSubscribeOrders)
router.get("/view-orderDetails",authMiddleware.isAuthenticated,subscribeDeliveryOrderController.ViewSubscribeOrderDetails)
router.post("/complete-order",authMiddleware.isAuthenticated,subscribeDeliveryOrderController.CompleteSubscriptionOrder)
router.post("/accept-subscribe-order",authMiddleware.isAuthenticated,subscribeDeliveryOrderController.AcceptSubscriptionOrder)

module.exports = router
