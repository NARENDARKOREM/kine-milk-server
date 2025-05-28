const express = require('express');
const router = express.Router();
const riderAuthController = require('../../UserControllers/Delivery/rider_auth_controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const {upload,handleMulterError} = require('../../utils/multerConfig');

router.post("/verify-rider",riderAuthController.VerifyRiderMobile)
router.put("/edit-profile/:rider_id",authMiddleware.isAuthenticated,upload.single('img'),handleMulterError,riderAuthController.EditRiderProfile)
router.delete("/delete-rider-profile", authMiddleware.isAuthenticated,riderAuthController.DeleteRiderProfile);
router.post("/add-onesignal",authMiddleware.isAuthenticated,riderAuthController.UpdateOneSignalSubscription);
router.post("/remove-onesingal",authMiddleware.isAuthenticated,riderAuthController.RemoveOneSignalId);

module.exports = router;