const express = require('express');
const router = express.Router();
const riderTimeSlotController = require('../AdminControllers/RiderTimeslots.Controller');
const adminMiddleware = require("../middlewares/adminMiddleware")

router.post('/upsert', adminMiddleware.isAdmin,riderTimeSlotController.upsertRiderTimeSlot);
router.get('/getbyid/:id',adminMiddleware.isAdmin, riderTimeSlotController.getRiderTimeSlotById);
router.get('/getbystore/:store_id',adminMiddleware.isAdmin, riderTimeSlotController.getRiderTimeSlotsByStore);
router.delete('/delete/:id',adminMiddleware.isAdmin, riderTimeSlotController.deleteRiderTimeSlot);
router.patch('/toggle-status',adminMiddleware.isAdmin, riderTimeSlotController.toggleRiderTimeSlotStatus);

module.exports = router;