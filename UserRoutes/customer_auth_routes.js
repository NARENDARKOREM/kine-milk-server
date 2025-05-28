const express = require('express');
const router = express.Router();
const customerAuthController = require('../UserControllers/customer/customer_auth_controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.post("/verify-customer",customerAuthController.VerifyCustomerMobile)
router.get("/customer-details",authMiddleware.isAuthenticated,customerAuthController.FetchCustomerDetails)
router.patch("/edit-customer",authMiddleware.isAuthenticated,customerAuthController.UpdateCustomerDetails);
router.delete("/",authMiddleware.isAuthenticated,customerAuthController.deleteCustomer);

module.exports = router