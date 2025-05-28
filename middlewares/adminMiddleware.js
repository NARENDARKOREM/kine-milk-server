const Admin = require("../Models/Admin");
const jwt = require("jsonwebtoken");
const asyncHandler = require("./errorHandler");

exports.authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  console.log("Token: ", token);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No Token Provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Admin.findByPk(decoded.id);
    console.log("Authenticated user: ", user);
    if (!user) {
      return res.status(400).json({ message: "Unauthorized: User not found!" });
    }
    req.user = user;
    if (user.role === "admin") {
      req.user.role = "admin";
    } else if (user.role === "store") {
      req.store_id = user.id;
    } else {
      return res.status(403).json({ message: "Forbidden: Access Denied" });
    }
    next();
  } catch (error) {
    console.error("Token verification error: ", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
});

exports.isAdmin = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  // console.log("Token: ", token);

  if (!token) {
    return next(new Error("Unauthorized: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Decoded token: ", decoded);

    req.user = await Admin.findByPk(decoded.id);
    // console.log("Admin user found: ", req.user);

    if (!req.user) {
      return next(); // Move to next middleware (authMiddleware)
    }

    req.user.userType = "admin"; 
    next(); // Admin is authenticated, proceed
  } catch (err) {
    console.error("Token verification error: ", err);
    return next(); // Move to authMiddleware if token verification fails
  }
});



