const express = require("express");

const { isAuthenticated } = require("../../middlewares/authMiddleware");
const { getTimeSlotByStore } = require("../../UserControllers/customer/timeSlot_controller");

const router = express.Router();

router.get("/:store_id",getTimeSlotByStore);

module.exports = router