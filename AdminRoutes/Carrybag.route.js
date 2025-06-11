const express = require("express");
const router = express.Router();
const { upsertCarryBag, getAllCarryBags, getCarryBagById ,toggleCarryBagStatus,deleteCarryBag} = require("../AdminControllers/CarryBag.Controller");
const multer = require("multer");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|svg/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Only images are allowed."));
  },
});


// Routes
router.post("/upsert", upload.single("bagImage"), upsertCarryBag);
router.get("/all", getAllCarryBags);
router.get("/getbyid/:id", getCarryBagById);
router.patch("/toggle-status", toggleCarryBagStatus);
router.delete("/delete/:id", deleteCarryBag);

module.exports = router;