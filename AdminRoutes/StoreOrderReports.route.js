const express = require('express');
const router = express.Router();
const adminMiddleware = require("../middlewares/adminMiddleware")

const {
  getNormalOrdersByStore,
  downloadNormalOrdersByStore,
  downloadSingleNormalOrderByStore,
  getSubscribeOrdersByStore,
  downloadSubscribeOrdersByStore,
  downloadSingleSubscribeOrderByStore,
  getNormalOrders,
  downloadNormalOrders,
  downloadSingleNormalOrder,
  getSubscribeOrders,
  downloadSubscribeOrders,
  downloadSingleSubscribeOrder,
} = require('../AdminControllers/StoreOrderReports.Controller');

// Normal Orders By Store Routes
router.get('/normal-orders-by-store',adminMiddleware.isAdmin, getNormalOrdersByStore);
router.get('/normal-orders-by-store/download',adminMiddleware.isAdmin, downloadNormalOrdersByStore);
router.get('/normal-orders-by-store/single-download/:orderId',adminMiddleware.isAdmin, downloadSingleNormalOrderByStore);

// Subscribe Orders By Store Routes
router.get('/subscribe-orders-by-store',adminMiddleware.isAdmin, getSubscribeOrdersByStore);
router.get('/subscribe-orders-by-store/download',adminMiddleware.isAdmin, downloadSubscribeOrdersByStore);
router.get('/subscribe-orders-by-store/single-download/:orderId',adminMiddleware.isAdmin, downloadSingleSubscribeOrderByStore);

// Existing Routes (for completeness)
// router.get('/normal-orders', getNormalOrders);
// router.get('/normal-orders/download', downloadNormalOrders);
// router.get('/normal-orders/single-download/:orderId', downloadSingleNormalOrder);
// router.get('/subscribe-orders', getSubscribeOrders);
// router.get('/subscribe-orders/download', downloadSubscribeOrders);
// router.get('/subscribe-orders/single-download/:orderId', downloadSingleSubscribeOrder);

module.exports = router;