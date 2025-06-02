const express = require('express');
const router = express.Router();
const riderReports = require('../AdminControllers/RiderReport.Controllers');

// Routes
router.get('/rider-reports/instant', riderReports.getInstantRiderReports);
router.get('/rider-reports/subscription', riderReports.getSubscriptionRiderReports);
router.get('/rider-reports/combined', riderReports.getCombinedRiderReports);
router.get('/rider-reports/instant/download', riderReports.downloadInstantRiderReports);
router.get('/rider-reports/subscription/download', riderReports.downloadSubscriptionRiderReports);
router.get('/rider-reports/combined/download', riderReports.downloadCombinedRiderReports);
router.get('/rider-reports/:riderId/download', riderReports.downloadSingleRiderReport);
router.post('/rider-reports/selected/download', riderReports.downloadSelectedRiderReports);

module.exports = router;