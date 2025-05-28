const express = require('express');
const router = express.Router();
const subscribeOrdersController = require('../../UserControllers/Store/subscribe_orders_controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.post("/order-status",authMiddleware.isAuthenticated,subscribeOrdersController.FetchSubscribeOrdersByStatus)
router.post("/view-order",authMiddleware.isAuthenticated,subscribeOrdersController.ViewSubscribeOrderById)
router.post("/assign-order",authMiddleware.isAuthenticated,subscribeOrdersController.AssignOrderToRider)

module.exports = router;