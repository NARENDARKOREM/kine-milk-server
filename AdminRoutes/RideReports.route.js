const express = require('express');
const router = express.Router();
const riderReports = require('../AdminControllers/RiderReport.Controllers');

// Instant Rider Reports
// Routes
router.get('/instant', riderReports.getInstantRiderReports);
router.get('/instant/download', riderReports.downloadInstantRiderReports);
router.get('/subscription', riderReports.getSubscriptionRiderReports);
router.get('/subscription/download', riderReports.downloadSubscriptionRiderReports);
router.get('/combined', riderReports.getCombinedRiderReports);
router.get('/combined/download', riderReports.downloadCombinedRiderReports);
router.get('/download/:riderId', riderReports.downloadSingleRiderReport);

module.exports = router;

