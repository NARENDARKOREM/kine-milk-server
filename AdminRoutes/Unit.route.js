const express = require('express');
const router = express.Router();
const unitController = require('../AdminControllers/Unit.Controller');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.get('/units/all', adminMiddleware.isAdmin, unitController.getAllUnits);
router.post('/units/upsert', adminMiddleware.isAdmin, unitController.upsertUnit);
router.delete('/units/delete/:id', adminMiddleware.isAdmin, unitController.deleteUnit);
router.patch('/units/update-status', adminMiddleware.isAdmin, unitController.updateStatus);

module.exports = router;