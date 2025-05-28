const express = require('express');
const router = express.Router();
const {
  getStockReports,
  downloadAllStockReports,
  downloadSingleStoreStockReport,
  getStockReportsByStore,
  downloadStockReportsByStore,
} = require('../AdminControllers/StoreStockReports.Controller');
const adminMiddleware = require("../middlewares/adminMiddleware")
// Stock Reports Routes
router.get('/stock-reports',adminMiddleware.isAdmin, getStockReports);
router.get('/stock-reports/download',adminMiddleware.isAdmin, downloadAllStockReports);
router.get('/stock-reports/download/:storeId',adminMiddleware.isAdmin, downloadSingleStoreStockReport);
router.get('/stock-reports/by-store',adminMiddleware.isAdmin, getStockReportsByStore);
router.get('/stock-reports/download-by-store',adminMiddleware.isAdmin, downloadStockReportsByStore);

module.exports = router;