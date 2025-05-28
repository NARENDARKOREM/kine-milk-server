const express = require("express");
const { upSertAddress, getAddress, deleteAddress } = require("../../UserControllers/customer/address_controller");

const { isAuthenticated } = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post("/",isAuthenticated,upSertAddress);
router.get("/",isAuthenticated,getAddress);
router.delete("/:addressId",isAuthenticated,deleteAddress);


module.exports = router;