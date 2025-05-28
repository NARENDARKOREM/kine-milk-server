const Rider = require('../../Models/Rider');
const asyncHandler = require('../../middlewares/errorHandler');
const uploadToS3 = require("../../config/fileUpload.aws");
const logger = require("../../utils/logger");
const { Op } = require('sequelize');
const {deliveryFirebase} = require('../../config/firebase-config');

const AddRider = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const uid = req.user?.storeId;
  if (!uid) {
      return res.status(400).json({
          ResponseCode: "401",
          Result: "false",
          ResponseMsg: "User ID not provided",
      });
  }

  console.log("Fetching products for user ID:", uid);
  console.log(req.body, "************************** BODY CHECK");

  const { store_id, title, email, mobile, ccode, status, rdate } = req.body;

  if (!store_id || !title || !email || !mobile || !ccode || !status || !rdate) {
      return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
      let imageUrl = null;
      if (req.file) {
          console.log("File detected:", req.file);
          imageUrl = await uploadToS3(req.file, "rider-images");
      }

      const formattedPhone = `+${ccode}${mobile}`;
      console.log("Formatted phone number:", formattedPhone);

      try {
          const userRecord = await deliveryFirebase.auth().getUserByPhoneNumber(formattedPhone);
          console.log("User already exists in Firebase:", userRecord.uid);
      } catch (firebaseError) {
          if (firebaseError.code === "auth/user-not-found") {
              try {
                  const newUser = await deliveryFirebase.auth().createUser({ phoneNumber: formattedPhone });
                  console.log("New Firebase user created:", newUser.uid);
              } catch (createError) {
                  console.error("Error creating Firebase user:", JSON.stringify(createError, null, 2));
                  return res.status(500).json({ success: false, message: "Error creating Firebase user", error: createError.message });
              }
          } else {
              console.error("Error fetching Firebase user:", JSON.stringify(firebaseError, null, 2));
              return res.status(500).json({ success: false, message: "Error checking Firebase user", error: firebaseError.message });
          }
      }

      const newRider = await Rider.create({
          store_id,
          title,
          email,
          mobile,
          ccode,
          status,
          img: imageUrl,
          rdate: new Date(),
      });

      res.status(200).json({ success: true, message: "Rider added successfully", rider: newRider });
  } catch (error) {
      console.error("Error adding rider:", JSON.stringify(error, null, 2));
      res.status(500).json({ success: false, message: "Error adding rider", error: error.message });
  }
});


const EditRider = asyncHandler(async (req, res) => {
    console.log("Decoded User:", req.user);
  
    const uid = req.user.storeId;
    if (!uid) {
      return res.status(400).json({
        ResponseCode: "401",
        Result: "false",
        ResponseMsg: "User ID not provided",
      });
    }
  
    console.log("Fetching products for user ID:", uid);
    const { riderId } = req.params;
    let { store_id, title, email, mobile, ccode, status, rdate } = req.body;

    console.log(req.body, "************ BODY CHECK ************");

    try {
        const rider = await Rider.findByPk(riderId);
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider not found" });
        }

        let imageUrl = rider.img;
        if (req.file) {
            imageUrl = await uploadToS3(req.file, "rider-images");
        }

        // Ensure store_id is updated correctly
        store_id = store_id || rider.store_id;

        await rider.update({
            store_id,
            title,
            email,
            mobile,
            ccode,
            status,
            img: imageUrl,
            rdate
        });

        res.status(200).json({ success: true, message: "Rider updated successfully", rider });
    } catch (error) {
        console.error("Error updating rider:", error);
        res.status(500).json({ success: false, message: "Error updating rider", error: error.message });
    }
});

const GetStoreRiderById = asyncHandler(async (req, res) => {
    console.log("Decoded User:", req.user);
  
    const uid = req.user.storeId;
    if (!uid) {
      return res.status(400).json({
        ResponseCode: "401",
        Result: "false",
        ResponseMsg: "User ID not provided",
      });
    }
  
    console.log("Fetching products for user ID:", uid);
    try {
        const { storeId } = req.params;
        if (!storeId) {
            return res.status(400).json({ success: false, message: "Store ID is required" });
        }
        const riders = await Rider.findAll({
            where: { store_id: storeId },
        });
        res.status(200).json({ success: true, riders });
    } catch (error) {
        console.error("Error fetching store riders:", error);
        res.status(500).json({ success: false, message: "Error fetching store riders", error: error.message });
    }
});

const SearchRiderByTitle = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const uid = req.user?.storeId;
  if (!uid) {
      return res.status(400).json({
          ResponseCode: "401",
          Result: "false",
          ResponseMsg: "User ID not provided",
      });
  }

  console.log("Fetching riders for user ID:", uid);

  const { title, storeId } = req.query; // Use query parameters

  if (!title) {
      return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Rider name is required",
      });
  }

  if (!storeId) {
      return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Store ID is required",
      });
  }

  try {
      const riders = await Rider.findAll({
          where: {
              store_id: storeId,
              title: {
                  [Op.like]: `%${title}%`,
              },
          },
      });

      if (!riders.length) {
          return res.status(404).json({
              ResponseCode: "404",
              Result: "false",
              ResponseMsg: "No matching rider found",
          });
      }

      return res.status(200).json({
          ResponseCode: "200",
          Result: "true",
          ResponseMsg: "Rider fetched successfully",
          Data: riders,
      });

  } catch (error) {
      console.error("Error searching for rider:", error);
      return res.status(500).json({
          ResponseCode: "500",
          Result: "false",
          ResponseMsg: "Internal Server Error",
          Error: error.message,
      });
  }
});

  const GetAllStoreRiders = asyncHandler(async(req,res)=>{
    console.log("Decoded User:", req.user);
    const uid = req.user.storeId;
    if (!uid) {
      return res.status(400).json({
        ResponseCode: "401",
        Result: "false",
        ResponseMsg: "User ID not provided",
      });
    }
    console.log("Fetching products for user ID:", uid);
const {storeId}=req.params;
    try {
      const riders = await Rider.findAll({where:{store_id:storeId}});
      if(!riders){
        return res.status(404).json({message:"Riders not found!"})
      }
      if(riders.length===0){
        return res.status(404).json({message:"No Riders found!"})
        
      }
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        message: "Riders fetched successfully",
        riders: riders,
    });
    } catch (error) {
      console.error("Error Fetching for rider:", error);
      return res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Internal Server Error",
        Error: error.message,
      });
    }
  })


module.exports = { AddRider, EditRider,GetStoreRiderById,SearchRiderByTitle,GetAllStoreRiders };
