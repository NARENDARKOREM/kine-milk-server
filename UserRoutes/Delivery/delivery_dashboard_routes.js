const express = require('express');
const router = express.Router();
const deliveryDashboard = require('../../UserControllers/Delivery/delivery_dashboard_controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get("/delivery-data",authMiddleware.isAuthenticated,deliveryDashboard.DeliveryDashboard);

module.exports = router