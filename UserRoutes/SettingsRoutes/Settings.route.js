const express = require("express");
const router = express.Router();
const PolicyController = require("../../UserControllers/Settings/Policy.Controller");

// Get policies
router.get("/getpolicies", PolicyController.getPolicies);

module.exports = router;