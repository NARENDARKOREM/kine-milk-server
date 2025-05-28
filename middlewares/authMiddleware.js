const jwt = require("jsonwebtoken");
const Store = require("../Models/Store");
const User = require("../Models/User");
const Rider = require("../Models/Rider");

// const isAuthenticated = (req, res, next) => {
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!token) {
//         return res.status(401).json({ message: "Unauthorized: No token provided" });
//     }
//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         console.log(decoded,"decodeddddddddddddddddddddddd")
//         req.user = decoded;
//         next();

//     } catch (error) {
//         return res.status(401).json({ message: "Unauthorized: Invalid token" });
//     }
// };

// const isAuthenticated = async (req, res, next) => {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) {
//         return res.status(401).json({ message: "Unauthorized: No token provided" });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         console.log("Decoded Token:", decoded);

//         if (!decoded.userId && !decoded.storeId) {
//             return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
//         }

//         let user = null;

//         // First check in Store table if storeId exists
//         if (decoded.storeId) {
//             user = await Store.findByPk(decoded.storeId);
//         }

//         // If storeId is not found, check in User table
//         if (!user && decoded.userId) {
//             console.log("Store not found in Store table. Checking User table...");
//             user = await User.findByPk(decoded.userId);
//         }

//         if (!user) {
//             console.error("User not found in both tables. ID:", decoded.userId || decoded.storeId);
//             return res.status(401).json({ message: "Unauthorized: User not found" });
//         }

//         // Add userId to req.user for consistency
//         req.user = {
//             ...user.toJSON(),
//             userId: decoded.userId || user.id, // Use decoded.userId or fall back to user.id
//         };

//         console.log("User Authenticated:", req.user);
//         next();
//     } catch (error) {
//         console.error("JWT Error:", error.message);
//         return res.status(401).json({ message: "Unauthorized: Invalid token" });
//     }
// };

const isAuthenticated = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);
  
      // Check if the token contains a valid identifier (userId, storeId, or riderId)
      if (!decoded.userId && !decoded.storeId && !decoded.riderId) {
        return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
      }
  
      let user = null;
  
      // Check Rider table if riderId exists
      if (decoded.riderId) {
        user = await Rider.findByPk(decoded.riderId);
        if (user) {
          req.user = {
            ...user.toJSON(),
            riderId: decoded.riderId,
          };
          console.log("Rider Authenticated:", req.user);
          return next(); 
        }
      }
  
      // Check Store table if storeId exists
      if (decoded.storeId) {
        user = await Store.findByPk(decoded.storeId);
        if (user) {
          req.user = {
            ...user.toJSON(),
            storeId: decoded.storeId,
          };
          console.log("Store Authenticated:", req.user);
          return next();
        }
      }
  
      // Check User table if userId exists
      if (decoded.userId) {
        console.log("Checking User table...");
        user = await User.findByPk(decoded.userId);
        if (user) {
          req.user = {
            ...user.toJSON(),
            userId: decoded.userId,
          };
          console.log("User Authenticated:", req.user);
          return next(); 
        }
      }
  
      // If no user, store, or rider is found
      if (!user) {
        console.error("Entity not found. Decoded:", decoded);
        return res.status(401).json({ message: "Unauthorized: Entity not found" });
      }
  
    } catch (error) {
      console.error("JWT Error:", error.message);
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  };
  
module.exports = { isAuthenticated };
