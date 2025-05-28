const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middlewares/adminMiddleware');
const upload = require('../utils/multerConfig');
const Subscribecontroller = require("../AdminControllers/SubscriptionOrder.controller")

router.get("/getall/:store_id/:status",adminMiddleware.isAdmin,Subscribecontroller.getAllSubscriptionOrdersbystoreid)

module.exports = router