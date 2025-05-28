const express = require('express');
const router = express.Router();
const {
  getNormalPaymentsByStore,
  downloadNormalPaymentsByStore,
  downloadSingleNormalPaymentByStore,
  getSubscribePaymentsByStore,
  downloadSubscribePaymentsByStore,
  downloadSingleSubscribePaymentByStore,
//   getNormalPayments,
//   downloadNormalPayments,
//   downloadSingleNormalPayment,
//   getSubscribePayments,
//   downloadSubscribePayments,
//   downloadSingleSubscribePayment,
} = require('../AdminControllers/StorePaymentReport.Controller');
const adminMiddleware = require("../middlewares/adminMiddleware")
// Normal Payments By Store Routes
router.get('/normal-payments-by-store',adminMiddleware.isAdmin, getNormalPaymentsByStore);
router.get('/normal-payments-by-store/download',adminMiddleware.isAdmin, downloadNormalPaymentsByStore);
router.get('/normal-payments-by-store/download/:orderId',adminMiddleware.isAdmin, downloadSingleNormalPaymentByStore);

// Subscribe Payments By Store Routes
router.get('/subscribe-payments-by-store',adminMiddleware.isAdmin, getSubscribePaymentsByStore);
router.get('/subscribe-payments-by-store/download',adminMiddleware.isAdmin, downloadSubscribePaymentsByStore);
router.get('/subscribe-payments-by-store/download/:orderId',adminMiddleware.isAdmin, downloadSingleSubscribePaymentByStore);

// Existing Routes
// router.get('/normal-payments', getNormalPayments);
// router.get('/normal-payments/download', downloadNormalPayments);
// router.get('/normal-payments/download/:orderId', downloadSingleNormalPayment);
// router.get('/subscribe-payments', getSubscribePayments);
// router.get('/subscribe-payments/download', downloadSubscribePayments);
// router.get('/subscribe-payments/download/:orderId', downloadSingleSubscribePayment);

module.exports = router;