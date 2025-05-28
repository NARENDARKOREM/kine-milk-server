const express = require('express');
const router = express.Router();
const faqController = require('../../UserControllers/customer/faq_controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get('/',authMiddleware.isAuthenticated,faqController.GetFAQs)

module.exports = router;