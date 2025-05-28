const User = require("../../Models/User");
const asyncHandler = require("../../middlewares/errorHandler");
const { customerFirebase } = require('../../config/firebase-config');
const jwt = require('jsonwebtoken');
const SubscribeOrder = require("../../Models/SubscribeOrder");
const NormalOrder = require("../../Models/NormalOrder");
const Address = require("../../Models/Address");
const Favorite = require("../../Models/Favorite");
const Cart = require("../../Models/Cart");
const uploadToS3 = require("../../config/fileUpload.aws");
const { generateReferralCode } = require("../../utils/referralCode");
const WalletReport = require("../../Models/WalletReport");
const { v4: uuidv4 } = require('uuid');
const Setting = require("../../Models/Setting");
const Illustration = require("../../Models/Illustration");

const VerifyCustomerMobile = asyncHandler(async (req, res) => {
  let { mobile, refercode } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: "Mobile number is required!" });
  }

  // Ensure mobile number follows E.164 format
  if (!mobile.startsWith("+")) {
    mobile = `+${mobile}`;
  }

  try {
    console.log("Checking mobile number in Firebase:", mobile);
    const userRecord = await customerFirebase.auth().getUserByPhoneNumber(mobile);

    if (!userRecord) {
      return res.status(404).json({ message: "Mobile number not found in Firebase." });
    }

    let user = await User.findOne({ where: { mobile } });
    const setting = await Setting.findOne();

    const referralAmount =
      setting && setting.refferal_amount !== null
        ? parseFloat(setting.refferal_amount)
        : 0;

    if (!user) {
      user = await User.create({
        mobile,
        email: userRecord.email || null,
        name: userRecord.displayName || null,
        status: 1,
        registartion_date: new Date(),
        refercode: generateReferralCode(),
        parentcode: null,
      });

      if (refercode) {
        const referrer = await User.findOne({ where: { refercode } });
        if (!referrer || referrer.id === user.id) {
          console.log("Invalid referral code or self-referral detected.");
        } else {
          await user.update({ parentcode: refercode });
          const newWalletBalance = (referrer.wallet || 0) + referralAmount;
          await referrer.update({ wallet: newWalletBalance });

          const transactionNo = `TXN${uuidv4().split("-")[0]}`;
          await WalletReport.create({
            uid: referrer.id,
            message: `Referral reward for inviting user ${mobile}`,
            status: 1,
            amt: referralAmount,
            transaction_no: transactionNo,
            tdate: new Date(),
            transaction_type: "Credited",
          });
        }
      }
    } else {
      // Existing user
      if (!user.refercode) {
        await user.update({ refercode: generateReferralCode() });
      }

      if (refercode && !user.parentcode) {
        const referrer = await User.findOne({ where: { refercode } });
        if (!referrer || referrer.id === user.id) {
          return res.status(400).json({ message: "Invalid referral code or self-referral not allowed!" });
        }

        await user.update({ parentcode: refercode });
        const newWalletBalance = (referrer.wallet || 0) + referralAmount;
        await referrer.update({ wallet: newWalletBalance });

        const transactionNo = `TXN${uuidv4().split("-")[0]}`;
        await WalletReport.create({
          uid: referrer.id,
          message: `Referral reward for inviting user ${mobile}`,
          status: 1,
          amt: referralAmount,
          transaction_no: transactionNo,
          tdate: new Date(),
          transaction_type: "Credited",
        });
      }
    }
    // Create Firebase custom token for this user (backend)
    // const firebaseCustomToken = await customerFirebase.auth().createCustomToken(userRecord.uid);
    const token = jwt.sign(
      { userId: user.id, mobile: user.mobile },
      process.env.JWT_SECRET,
    );

    return res.status(200).json({
      message: "Mobile number verified successfully!",
      user,
      token,
      // firebaseCustomToken
    });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ message: "Mobile number not registered in Firebase." });
    }
    console.error("Error verifying mobile:", error.message);
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
});


const VerifyCustomerMobileANDUUID = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const userId = req.user.userId;
  if (!userId) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }
  const { mobile, uid } = req.body;

  if (!mobile || !uid) {
    return res.status(400).json({ message: "Mobile number and UID are required!" });
  }

  const formattedMobile = mobile.startsWith("+") ? mobile : `+${mobile}`;

  try {
    // Get user by UID from Firebase
    const userRecord = await customerFirebase.auth().getUser(uid);

    // Check if mobile matches
    if (userRecord.phoneNumber !== formattedMobile) {
      return res.status(400).json({ message: "UID and mobile number do not match Firebase record." });
    }

    // Find user in your local database
    const user = await User.findOne({ where: { mobile: formattedMobile } });

    if (!user) {
      return res.status(404).json({ message: "User not found in local database." });
    }

    // Generate your own JWT
    const token = jwt.sign(
      { userId: user.id, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: "OTP verified successfully!",
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        wallet: user.wallet,
        refercode: user.refercode,
        parentcode: user.parentcode,
        status: user.status,
        registartion_date: user.registartion_date,
      },
      token,
    });

  } catch (error) {
    console.error("Error verifying Firebase UID and mobile:", error.message);
    return res.status(500).json({ message: "Verification failed: " + error.message });
  }
});



const FetchCustomerDetails = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const uid = req.user.userId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }

  try {
    console.log("Fetching customer details for user ID:", uid);

    const customer = await User.findOne({ where: { id: uid } });

    if (!customer) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Customer not found",
      });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Customer details fetched successfully",
      customer,
    });

  } catch (error) {
    console.error("Error fetching customer details:", error.message);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error: " + error.message,
    });
  }
});

const UpdateCustomerDetails = asyncHandler(async (req, res) => {
  console.log("Decoded User:", req.user);

  const uid = req.user.userId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }

  const { name, email } = req.body;
  const file = req.file;

  if (!name && !email) {
    return res.status(400).json({
      ResponseCode: "402",
      Result: "false",
      ResponseMsg: "At least one field (name or email) must be provided for update",
    });
  }

  try {
    console.log(
      `Updating customer (ID: ${uid}) details - Name: ${name}, Email: ${email}, Image: ${file ? file.originalname : "None"
      }`
    );

    const customer = await User.findOne({ where: { id: uid } });

    if (!customer) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Customer not found",
      });
    }

    let imageUrl = customer.img;
    if (file) {
      imageUrl = await uploadToS3(file, "profile-images")
    }

    await customer.update({
      name: name || customer.name,
      email: email || customer.email,
      img: imageUrl
    });

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Customer details updated successfully",
      customer,
    });

  } catch (error) {
    console.error("Error updating customer details:", error.message);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error: " + error.message,
    });
  }
});

const deleteCustomer = async (req, res) => {
  const uid = req.user.userId;
  if (!uid) {
    return res.status(400).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "User ID not provided",
    });
  }

  try {
    const customer = await User.findOne({ where: { id: uid } });

    if (!customer) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Customer not found",
      });
    }

    if (customer.img) {
      const urlParts = customer.img.split("/");
      const key = urlParts.slice(3).join("/");

      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: process.env.AWS_ACCESS_KEY_ID,
      };
      try {
        const command = new DeleteObjectCommand(deleteParams);
        await s3.send(command);
        console.log(`Deleted image from S3: ${key}`);
      } catch (s3Error) {
        console.error("Error deleting image from S3:", s3Error.message);
      }
    }

    const suborder = await SubscribeOrder.destroy({ where: { uid } });
    const normalOrder = await NormalOrder.destroy({ where: { uid } });
    const address = await Address.destroy({ where: { uid } });
    const fav = await Favorite.destroy({ where: { uid } });
    const cart = await Cart.destroy({ where: { uid } });

    const deletedRows = await User.destroy({ where: { id: uid } });

    if (deletedRows === 0) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Customer not found",
      });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error.message);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error: " + error.message,
    });
  }
};


const updateOneSignalSubscription = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { one_subscription } = req.body;

    // Validate required fields
    if (!one_subscription) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "OneSignal subscription is required",
      });
    }

    // Fetch user by ID
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User not found",

      });
    }

    await user.update({ one_subscription });

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "OneSignal subscription updated successfully",


    });
  } catch (error) {
    console.error("Error updating OneSignal subscription:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error: " + error.message,


    });
  }
};

const removeOneSignalId = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized",
    });
  }
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User not found",
      })


    }
    if (!user.one_subscription) {
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "OneSignal subscription is already removed",
      })

    }
    await user.update({ one_subscription: null });
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "OneSignal subscription removed successfully",
    })

  } catch (error) {
    console.error("Error removing OneSignal ID:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error: " + error.message,
    });
  }
};


const GetReferralCode = async (req, res) => {
  const uid = req.user.userId;

  if (!uid) {
    return res.status(401).json({ message: "Unauthorized: User not found!" });
  }

  try {
    let user = await User.findByPk(uid);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const setting = await Setting.findOne();
    const referralAmount = setting && setting.refferal_amount !== null
      ? parseFloat(setting.refferal_amount)
      : 0;

    if (!user.refercode) {
      const refercode = generateReferralCode();
      await user.update({ refercode });
    }

    return res.status(200).json({
      message: "Referral code fetched successfully!",
      refercode: user.refercode,
      referralAmount,
      // referralLink: `${process.env.APP_BASE_URL}/signup?ref=${user.refercode}`, // Use env variable for base URL
    });
  } catch (error) {
    console.error("Error fetching referral code:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

const ApplyReferralCode = async (req, res) => {
  const uid = req.user.userId;
  const { refercode } = req.body;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized: User not found!" });
  }
  if (!refercode) {
    return res.status(400).json({ message: "Referal code is required!" })
  }
  try {
    const newUser = await User.findByPk(uid);
    if (!newUser) {
      return res.status(404).json({ message: "New user not found!" });
    }

    if (newUser.parentcode) {
      return res.status(400).json({ message: "Referral code already applied!" });
    }

    const referrer = await User.findOne({ where: { refercode } })
    if (!referrer || referrer.id === uid) {
      return res.status(400).json({ message: "Invalid referral code or self-referral not allowed!" });
    }

    await newUser.update({ parentcode: refercode });

    const rewardAmount = 100;
    const newWalletBalance = (referrer.wallet || 0) + rewardAmount;
    await referrer.update({ wallet: newWalletBalance })

    const transactionNo = `TXN${uuidv4().split("-")[0]}`;
    await WalletReport.create({
      uid: referrer.id,
      message: `Referral reward for inviting user ${newUser.mobile}`,
      status: 1,
      amt: rewardAmount,
      transaction_no: transactionNo,
      tdate: new Date(),
      transaction_type: "Credited"
    });

    return res.status(200).json({
      message: "Referral applied successfully!",
      parentcode: newUser.parentcode,
      referralWallet: newWalletBalance
    })
  } catch (error) {
    console.error("Error applying referral code:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const getAuthIllustrtions = async(req,res)=>{
  try {
    const illustrations = await Illustration.findAll({where:{status:1}});
    if(!illustrations){
      return res.status(400).json({
        ResponseCode:"400",
        Result:"false",
        ResponseMsg:"Auth Illustrations are not found!"
      })
    }
    return res.status(200).json({
      ResponseCode:"200",
      Result:"true",
      ResponseMsg:"Auth Illustrtion fetched successfully.",
      illustrations
    })
  } catch (error) {
    console.error("Error applying referral code:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  VerifyCustomerMobile,
  VerifyCustomerMobileANDUUID,
  FetchCustomerDetails,
  UpdateCustomerDetails,
  deleteCustomer,
  updateOneSignalSubscription,
  removeOneSignalId,
  GetReferralCode,
  ApplyReferralCode,
  getAuthIllustrtions
};
