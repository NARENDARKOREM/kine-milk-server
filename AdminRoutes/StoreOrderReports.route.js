const express = require('express');
const router = express.Router();
const orderReports = require('../AdminControllers/StoreOrderReports.Controller');

router.get('/orders/normal-orders-by-store', orderReports.getNormalOrdersByStore);
router.get('/orders/normal-orders-by-store/download', orderReports.downloadNormalOrdersByStore);
router.get('/orders/normal-orders-by-store/:orderId/download', orderReports.downloadSingleNormalOrderByStore);
router.get('/orders/subscribe-orders-by-store', orderReports.getSubscribeOrdersByStore);
router.get('/orders/subscribe-orders-by-store/download', orderReports.downloadSubscribeOrdersByStore);
router.get('/orders/subscribe-orders-by-store/:orderId/download', orderReports.downloadSingleSubscribeOrderByStore);

module.exports = router;