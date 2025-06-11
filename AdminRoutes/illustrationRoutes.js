const express = require('express');
const router = express.Router();
const { upload, handleMulterError } = require("../utils/multerConfig");
illustrationController = require("../AdminControllers/Illustration.Controller")
const adminMiddleware = require('../middlewares/adminMiddleware');


router.post(
  "/upsert-illustration",
  upload.single("img"),
  handleMulterError,
  adminMiddleware.isAdmin,
  illustrationController.upsertIllustration
);

router.get(
  "/fetch-illustrations",
  adminMiddleware.isAdmin,
  illustrationController.fetchIllustrations
);

router.get(
  "/getillustrationbyid/:id",
  adminMiddleware.isAdmin,
  illustrationController.fetchIllustrationById
);

router.patch(
  "/toggle-status",
  adminMiddleware.isAdmin,
  illustrationController.toggleIllustrationStatus
);

router.delete(
  "/delete-illustration/:id",
  adminMiddleware.isAdmin,
  illustrationController.deleteIllustrationById
);

module.exports = router;