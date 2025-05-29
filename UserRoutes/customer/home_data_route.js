const express = require("express");
const {
  homeAPI,
  NotificationsAPI,
  HomeScreenAPI,
  homeCategoriesAPI,
  homeProductsAPI,
  getDiscountedProducts,
} = require("../../UserControllers/customer/home_date_controller");
const homeScreenAPIs = require("../../UserControllers/customer/home_date_controller");
const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post("/:pincode?", homeScreenAPIs.homeAPI);
router.post("/discouted-products/:pincode", homeScreenAPIs.getDiscountOfferProducts);
router.get("/", homeScreenAPIs.HomeScreenAPI);
router.post("/home-categories/:pincode", homeScreenAPIs.homeCategoriesAPI);
router.post("/home-products/:pincode", homeScreenAPIs.homeProductsAPI);

module.exports = router;
