const express = require('express');
const router = express.Router();
const storeUserControllers = require('../../UserControllers/Store/store_user_controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const {upload,handleMulterError} = require('../../utils/multerConfig');

router.get("/profile",authMiddleware.isAuthenticated,storeUserControllers.StoreProfile);
router.patch("/edit-profile/:storeId",authMiddleware.isAuthenticated,upload.single('rimg'),handleMulterError,storeUserControllers.EditStoreProfile);
router.post("/verify-mobile",storeUserControllers.verifyMobile)
router.post('/add-onesignal',authMiddleware.isAuthenticated,storeUserControllers.UpdateOneSignalSubscription);
router.post('/remove-onsignal',authMiddleware.isAuthenticated,storeUserControllers.RemoveOneSignalId)

module.exports = router;