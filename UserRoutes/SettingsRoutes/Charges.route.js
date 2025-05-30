const express = require('express');
const settingController = require('../../UserControllers/Settings/Charges.Controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const router = express.Router()

router.get("/order-charges",authMiddleware.isAuthenticated,settingController.getCharges);
router.get("/carry-bags",authMiddleware.isAuthenticated,settingController.getCarryBags);

module.exports = router