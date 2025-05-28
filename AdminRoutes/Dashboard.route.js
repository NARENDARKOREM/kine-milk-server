const express = require("express");
const router = express.Router();
const { getDashboardData } = require("../AdminControllers/Dashboard.controller");
const adminMiddleware = require("../middlewares/adminMiddleware")

// Define the dashboard route
router.get("/dashboard", adminMiddleware.isAdmin,getDashboardData);

module.exports = router;
