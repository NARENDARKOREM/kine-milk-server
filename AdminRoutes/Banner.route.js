const express = require('express');
const router = express.Router();
const { upload, handleMulterError } = require("../utils/multerConfig");
const bannerController = require('../AdminControllers/Banner.Controller');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.post(
    "/upsert-banner",
    upload.single("img"),
    handleMulterError,
    adminMiddleware.isAdmin,
    bannerController.upsertBanner
  );
router.get("/fetch-banners", adminMiddleware.isAdmin,bannerController.fetchBanners);

router.get("/getbannerbyid/:id", adminMiddleware.isAdmin, bannerController.fetchBannerById);

router.patch("/toggle-status",bannerController.toggleBannerStatus);


router.delete("/deletebannerbyid/:id",bannerController.deleteBannerById),


module.exports = router;