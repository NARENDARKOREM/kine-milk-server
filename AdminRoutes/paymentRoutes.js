const express = require('express');
const router = express.Router();
const paymentController = require('../AdminControllers/paymentController');
const adminMiddleware = require("../middlewares/adminMiddleware")
// Normal Payment Routes
router.get('/normal-payments',adminMiddleware.isAdmin, paymentController.getNormalPayments);
router.get('/normal-payments/download',adminMiddleware.isAdmin, paymentController.downloadNormalPayments);
router.get('/normal-payments/download/:orderId',adminMiddleware.isAdmin, paymentController.downloadSingleNormalPayment);

// Subscribe Payment Routes
router.get('/subscribe-payments',adminMiddleware.isAdmin, paymentController.getSubscribePayments);
router.get('/subscribe-payments/download',adminMiddleware.isAdmin, paymentController.downloadSubscribePayments);
router.get('/subscribe-payments/download/:orderId',adminMiddleware.isAdmin, paymentController.downloadSingleSubscribePayment);

module.exports = router;