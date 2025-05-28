const express = require("express");
const router = express.Router();
const { getStoreDashboardData } = require("../AdminControllers/StoreDashboard.controller");
const adminMiddleware  = require("../middlewares/adminMiddleware")
// Define the dashboard route
router.get("/dashboard/:store_id",adminMiddleware.isAdmin, getStoreDashboardData);

module.exports = router;
