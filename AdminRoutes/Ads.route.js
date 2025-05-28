const express = require("express");
const router = express.Router();
const { upload, handleMulterError } = require("../utils/multerConfig");
const adsController = require("../AdminControllers/Ads.Controller");
const adminMiddleware = require("../middlewares/adminMiddleware");

router.post(
  "/upsert-ads",
  upload.single("img"),
  handleMulterError,
  adminMiddleware.isAdmin,
  adsController.upsertAds
);

router.get(
  "/fetch-ads",
  adminMiddleware.isAdmin,
  adsController.fetchAds
);

router.get(
  "/getadsbyid/:id",
  adminMiddleware.isAdmin,
  adsController.fetchAdsById
);

router.patch(
  "/toggle-status",
  adminMiddleware.isAdmin,
  adsController.toggleAdsStatus
);

router.delete(
  "/delete-ads/:id",
  adminMiddleware.isAdmin,
  adsController.deleteAdsById
);

module.exports = router;