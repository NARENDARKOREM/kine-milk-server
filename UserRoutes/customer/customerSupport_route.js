const express = require("express");
const { customerSupport } = require("../../UserControllers/customer/customerSupport");

const router = express.Router();

router.get("/:storeId",customerSupport);



module.exports = router;