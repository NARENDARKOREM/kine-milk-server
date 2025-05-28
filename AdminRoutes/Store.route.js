const express = require('express');
const router = express.Router();
const storeController = require('../AdminControllers/Store.Controller');
const adminMiddleware = require('../middlewares/adminMiddleware');
const {upload,handleMulterError} = require('../utils/multerConfig');


router.post("/upsert",adminMiddleware.isAdmin,upload.fields([
    {name:"rimg",maxCount:1},
    {name:"cover_img",maxCount:1}
]),handleMulterError,storeController.upsertStore);
router.get("/fetch",adminMiddleware.isAdmin,storeController.fetchStores);
router.get("/fetch/:id",adminMiddleware.isAdmin,storeController.fetchStoreById);
router.delete("/delete/:id",adminMiddleware.isAdmin,storeController.deleteStore);
router.patch("/toggle-status",adminMiddleware.isAdmin,storeController.toggleStoreStatus)
router.put('/update-email-password/:store_id',adminMiddleware.isAdmin, storeController.updateStoreEmailPassword);


module.exports = router;