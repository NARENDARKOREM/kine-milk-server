const express = require("express");
const router = express.Router();

const adminController = require('../AdminControllers/Auth_controller');



router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);
router.patch("/updatepassword/:id",adminController.updateAdmin)
router.delete('/delete/:id', adminController.deleteAdmin);
router.get("/count",adminController.getAllAdmins)
router.get("/getById/:id",adminController.getAdminById)
router.post("/logout", adminController.logoutAdmin);
router.post("/search",adminController.searchAdmins)
router.get("/getrbytoken",adminController.getUserbyToken)

module.exports = router;
