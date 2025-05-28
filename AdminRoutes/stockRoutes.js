const express = require('express');
const router = express.Router();
const stockController = require('../AdminControllers/stockController');
const adminMiddleware = require("../middlewares/adminMiddleware")

router.get('/stock-reports',adminMiddleware.isAdmin, stockController.getStockReports);
router.get('/stock-reports/download',adminMiddleware.isAdmin, stockController.downloadAllStockReports);
router.get('/stock-reports/download/:storeId',adminMiddleware.isAdmin, stockController.downloadSingleStoreStockReport);

module.exports = router;
