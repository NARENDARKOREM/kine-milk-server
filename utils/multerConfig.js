const multer = require("multer");

const storage = multer.memoryStorage(); // Store files in RAM

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // Restrict to 1MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPEG, JPG, PNG, GIF, WEBP, and SVG files are allowed.")
      );
    }
    cb(null, true);
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Image size must be 1MB or less.",
    });
  }
  if (
    err.message ===
    "Only JPEG, JPG, PNG, GIF, WEBP, and SVG files are allowed."
  ) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: err.message,
    });
  }
  next(err);
};

module.exports = { upload, handleMulterError };