const express = require('express');
const router = express.Router();
const orderController = require('../AdminControllers/OrderController');
const adminMiddleware = require("../middlewares/adminMiddleware")

router.get('/normal-orders', adminMiddleware.isAdmin, orderController.getNormalOrders);
router.get('/normal-orders/download', adminMiddleware.isAdmin, orderController.downloadNormalOrders);
router.get('/normal-orders/single-download/:orderId', adminMiddleware.isAdmin, orderController.downloadSingleNormalOrder);
router.get('/subscribe-orders/download/:orderId', adminMiddleware.isAdmin,orderController.downloadSingleSubscribeOrder);
router.get('/subscribe-orders', adminMiddleware.isAdmin,orderController.getSubscribeOrders);
router.get('/subscribe-orders/download',adminMiddleware.isAdmin, orderController.downloadSubscribeOrders);

module.exports = router;