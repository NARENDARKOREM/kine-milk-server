const express = require('express');
const router = express.Router();
const ProductReviewController = require('../../UserControllers/customer/customer_reviews_controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const adminMiddleware = require("../../middlewares/adminMiddleware")

router.post("/post-review",authMiddleware.isAuthenticated,ProductReviewController.PostProductReviewForInstantOrder);
router.post("/post-review-subscribe",authMiddleware.isAuthenticated,ProductReviewController.PostProductReviewForSubscribeOrder);
router.post("/post-delivery-review",authMiddleware.isAuthenticated,ProductReviewController.PostDeliveryBoyReview);
router.get("/fetch-all-reviews",authMiddleware.isAuthenticated,ProductReviewController.FetchMyReviewsOnProducts)
router.get("/fetch-all-delivery-reviews",authMiddleware.isAuthenticated,ProductReviewController.FetchMyReviewsOnDeliveryBoys)
router.get("/productreviews", ProductReviewController.ProductReviews)

module.exports = router;