const express = require('express');
const { getCharges } = require('../../UserControllers/Settings/Charges.Controller');
const router = express.Router()

router.get("/order-charges",getCharges);

module.exports = router