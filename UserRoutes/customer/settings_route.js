const express = require('express');
const { getsetting } = require('../../UserControllers/customer/setting_controller');

const router = express.Router();


router.get("/", getsetting);


module.exports = router;