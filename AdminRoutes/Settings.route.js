const express = require("express");
const router = express.Router();
const {upload, handleMulterError} = require("../utils/multerConfig");
const SettingsController = require("../AdminControllers/Settings.Controller");
const adminMiddleware = require("../middlewares/adminMiddleware")

router.post("/upsertSettings", adminMiddleware.isAdmin,upload.single("weblogo"),handleMulterError, SettingsController.UpsertSettings);
router.get("/allsettings", adminMiddleware.isAdmin,SettingsController.getSettingsAll);

module.exports = router;