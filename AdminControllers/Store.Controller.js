const Store = require("../Models/Store");
const asyncHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const uploadToS3 = require("../config/fileUpload.aws");
const { upsertStoreSchema, storeDeleteSchema } = require("../utils/validation");
const {storeFirebase} = require("../config/firebase-config");
const bcrypt = require("bcryptjs");

const upsertStore = asyncHandler(async (req, res) => {
  try {
    const {
      id,
      title,
      status,
      rate,
      slogan,
      lcode,
      catid,
      full_address,
      pincode,
      landmark,
      lats,
      longs,
      email,
      rstatus,
      mobile,
      password,
      sdesc,
      cancle_policy,
      zone_id,
      slogan_title,
      opentime,
      closetime,
      is_pickup,
      owner_name,
      tags,
      // Commented out for potential future use
      /*
      bank_name,
      ifsc,
      receipt_name,
      acc_number,
      paypal_id,
      upi_id,
      */
    } = req.body;

    // Validate required fields
    if (!id && !password) {
      return res.status(400).json({ success: false, message: "Password is required when creating a new store." });
    }

    let rimg, cover_img;

    if (req.files?.rimg) {
      rimg = await uploadToS3(req.files.rimg[0], "store-logos");
    } else if (!id) {
      return res.status(400).json({ success: false, message: "Store logo is required for a new store." });
    }

    if (req.files?.cover_img?.[0]) {
      cover_img = await uploadToS3(req.files.cover_img[0], "store-covers");
    } else if (!id) {
      return res.status(400).json({ success: false, message: "Cover image is required for a new store." });
    }

    let store;
    if (id) {
      // Update existing store
      store = await Store.findByPk(id);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found." });
      }

      let hashedPassword = store.password;
      if (password) { // Only hash and update password if provided
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      await store.update({
        title,
        status,
        rate,
        slogan,
        lcode,
        catid,
        full_address,
        pincode,
        landmark,
        lats,
        longs,
        email,
        rstatus,
        mobile,
        password: hashedPassword, // Use existing password if not provided
        sdesc,
        cancle_policy,
        zone_id,
        slogan_title,
        opentime,
        closetime,
        is_pickup,
        rimg: rimg || store.rimg,
        cover_img: cover_img || store.cover_img,
        owner_name,
        tags,
        // Commented out for potential future use
        /*
        bank_name,
        ifsc,
        receipt_name,
        acc_number,
        paypal_id,
        upi_id,
        */
      });

      return res.status(200).json({ success: true, message: "Store updated successfully!", store });
    } else {
      // Create new store
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      store = await Store.create({
        title,
        status,
        rate,
        slogan,
        lcode,
        catid,
        full_address,
        pincode,
        landmark,
        lats,
        longs,
        email,
        rstatus,
        mobile,
        password: hashedPassword,
        sdesc,
        cancle_policy,
        zone_id,
        slogan_title,
        opentime,
        closetime,
        is_pickup,
        rimg,
        cover_img,
        owner_name,
        tags,
        // Commented out for potential future use
        /*
        bank_name,
        ifsc,
        receipt_name,
        acc_number,
        paypal_id,
        upi_id,
        */
      });

      // Check if the mobile number already exists in Firebase Authentication
      try {
        const userRecord = await storeFirebase.auth().getUserByPhoneNumber(`+${mobile}`);
        console.log("User already exists in Firebase:", userRecord.uid);
      } catch (firebaseError) {
        if (firebaseError.code === "auth/user-not-found") {
          // Create a new Firebase Authentication user with only the mobile number
          try {
            const newUser = await storeFirebase.auth().createUser({
              phoneNumber: `+${mobile}`,
            });
            console.log("New Firebase user created:", newUser.uid);
          } catch (createError) {
            console.error("Error creating Firebase user:", createError);
            return res.status(500).json({
              success: false,
              message: "Error creating Firebase user",
              error: createError.message,
            });
          }
        } else {
          console.error("Error fetching Firebase user:", firebaseError);
          return res.status(500).json({
            success: false,
            message: "Error checking Firebase user",
            error: firebaseError.message,
          });
        }
      }

      return res.status(200).json({ success: true, message: "Store created successfully!", store });
    }
  } catch (error) {
    console.error("Error in upsertStore:", error);
    return res.status(500).json({ success: false, message: "Failed to save store." });
  }
});

const fetchStores = asyncHandler(async(req,res)=>{
  try {
    const stores = await Store.findAll();

    

    if(!stores){
      res.status(400).json({message:"Store not found!"})
    }
    return res.status(200).json({success:true,message:"Store Fetched Successfully",stores})
  } catch (error) {
    logger.error("Error in Fetching Store:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
})

const fetchStoreById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const store = await Store.findByPk(id);
    if (!store) {
      return res.status(400).json({ message: "Store not found!" });
    }

    // Parse catid from JSON string to array
  

    return res.status(200).json({
      success: true,
      message: "Single Store Fetched Successfully",
      store
    });
  } catch (error) {
    logger.error("Error in Fetching Store:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

const deleteStore = asyncHandler(async (req, res) => {
  const dataToValidate = { ...req.params, ...req.body };
  const { error } = storeDeleteSchema.validate(dataToValidate);

  // if (error) {
  //   logger.error(error.details[0].message);
  //   return res.status(400).json({ error: error.details[0].message });
  // }

  try {
    const { id } = req.params;
    const { forceDelete } = req.query;

    const store = await Store.findOne({ where: { id }, paranoid: false });

    if (!store) {
      logger.error("Store not found!");
      return res.status(404).json({ error: "Store not found!" });
    }

    if (store.deletedAt && forceDelete !== "true") {
      logger.error("Store already Soft Deleted");
      return res.status(400).json({ error: "Store is already soft-deleted" });
    }

    if (forceDelete === "true") {
      await store.destroy({ force: true }); 
      logger.info("Store Permanently Deleted");
      return res.status(200).json({ message: "Store Permanently Deleted Successfully." });
    }

    await store.destroy();
    logger.info("Store Soft Deleted");
    return res.status(200).json({ message: "Store Soft Deleted Successfully." });

  } catch (error) {
    console.error("Error Occurred while deleting Store.");
    logger.error("Error Occurred while deleting Store.");
    res.status(500).json({ message: "Internal Server Error." });
  }
});

const toggleStoreStatus = async (req, res) => {
  console.log("Request received:", req.body);
  const { id, value } = req.body;

  try {
    const store = await Store.findByPk(id);

    if (!store) {
      logger.error("Store not found");
      return res.status(404).json({ message: "Store not found." });
    }

    store.status = value;
    await store.save();

    logger.info("Store updated successfully:", store);
    res.status(200).json({
      message: "Store status updated successfully.",
      updatedStatus: store.status,
    });
  } catch (error) {
    logger.error("Error updating Store status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}




const updateStoreEmailPassword = asyncHandler(async (req, res) => {
  try {
    const { store_id } = req.params; // store_id is coming from params, but it's actually 'id' in Store model
    const { email, password } = req.body;

    // Validate input
    if (!store_id) {
      return res.status(400).json({ success: false, message: "Store ID is required." });
    }
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    // Find store by ID (store_id is actually 'id' in the Store model)
    const store = await Store.findOne({ where: { id: store_id } });

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found." });
    }

    // Hash the password before updating
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update only email & password
    await store.update({ email, password: hashedPassword });

    return res.status(200).json({ success: true, message: "Store email and password updated successfully!" });
  } catch (error) {
    console.error("Error updating store email & password:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = { upsertStore,fetchStores,fetchStoreById,deleteStore,toggleStoreStatus,updateStoreEmailPassword  };
