const express = require('express');
const router = express.Router();
const customerAuthController = require('../../UserControllers/customer/customer_auth_controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const {upload,handleMulterError} = require("../../utils/multerConfig");


router.post("/verify-customer",customerAuthController.VerifyCustomerMobile)
router.post("/verify-customer-data",authMiddleware.isAuthenticated,customerAuthController.VerifyCustomerMobileANDUUID)
router.get("/customer-details",authMiddleware.isAuthenticated,customerAuthController.FetchCustomerDetails)
router.patch("/edit-customer",authMiddleware.isAuthenticated,upload.single("img"),handleMulterError,customerAuthController.UpdateCustomerDetails)
router.delete("/",authMiddleware.isAuthenticated,customerAuthController.deleteCustomer);
router.post("/add-onesignal",authMiddleware.isAuthenticated,customerAuthController.updateOneSignalSubscription);
router.post("/remove-onesignal",authMiddleware.isAuthenticated,customerAuthController.removeOneSignalId);
router.get("/referral/code",authMiddleware.isAuthenticated,customerAuthController.GetReferralCode);
router.post("/referral/apply",authMiddleware.isAuthenticated,customerAuthController.ApplyReferralCode);
router.get("/get-illustrations",customerAuthController.getAuthIllustrtions);


module.exports = router