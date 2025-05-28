const express = require("express");
const { notification_fn } = require("../UserControllers/customer/notification_controller");
const  authMiddleware  = require("../middlewares/authMiddleware");


const router = express.Router();

router.get("/", authMiddleware.isAuthenticated, notification_fn);


module.exports = router;