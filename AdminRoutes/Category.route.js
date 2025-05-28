const express=require("express")
const router=express.Router();
const categoryController=require("../AdminControllers/Category.Controller");
const {upload,handleMulterError} = require("../utils/multerConfig");
const adminMiddleware = require('../middlewares/adminMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

const allowAdminOrAuthenticated = (req, res, next) => {
    // First check if the user is admin
    adminMiddleware.isAdmin(req, res, (adminErr) => {
        if (!adminErr) {
            return next(); // Proceed if admin
        }

        // If the user is not an admin, check if the user is authenticated (store user)
        authMiddleware.isAuthenticated(req, res, (authErr) => {
            if (!authErr) {
                return next(); // Proceed if authenticated
            }

            // Deny access if neither admin nor authenticated
            return res.status(403).json({ message: "Access denied. Admin or authenticated user required." });
        });
    });
};

router.post("/upsert", upload.single("img"),handleMulterError,adminMiddleware.isAdmin,categoryController.upsertCategory);
router.get("/all", adminMiddleware.isAdmin,categoryController.getAllCategories);
router.get("/getbyid/:id",adminMiddleware.isAdmin,categoryController.getCategoryById)
router.delete("/delete/:id",adminMiddleware.isAdmin,categoryController.deleteCategory)
router.patch("/update/:id",adminMiddleware.isAdmin,categoryController.upsertCategory)
router.get("/count",adminMiddleware.isAdmin,categoryController.getCategoryCount)
router.patch("/toggle-status",adminMiddleware.isAdmin,categoryController.toggleCategoryStatus)

module.exports=router