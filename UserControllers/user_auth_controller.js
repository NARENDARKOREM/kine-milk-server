const User = require('../Models/User');
const asyncHandler = require('../middlewares/errorHandler');
const { otpLoginSchema, verifyOtpSchema } = require('../utils/validation');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase-config');

const otpLogin = asyncHandler(async(req,res)=>{
    console.log("BODY TYPE:", typeof req.body);  // should be 'object'
console.log("BODY:", req.body);


    const {error}=otpLoginSchema.validate(req.body);
    if(error) return res.status(400).json({error:error.details[0].message})
    const {ccode,mobile}=req.body;

    if(!ccode || !mobile){
        return res.status(403).json({
            message:"All Fields Required!"
        })
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(otp,"otpppppppp")
    try {
        const timestamp = new Date();
        const otpExpiresIn = new Date(Date.now() + 5 * 60 * 1000);
        const [user, created]=await User.findOrCreate({
            where:{mobile,ccode},
            defaults:{mobile,otp,otpExpiresIn,registartion_date:timestamp}
        });
        if(!created){
            await user.update({otp,otpExpiresIn})
        }
        await user.update({status:1})
        return res.status(200).json({
            ResponseCode:"200",
            message: "OTP sent successfully!",
            success:true,
            otp });
    } catch (error) {
        console.log("Error Otp Login",error.message);
        res.status(500).json({message:"Error Sending OTP: "+error.message})
    }
});

const verifyOtp = asyncHandler(async (req, res) => {
    const { error } = verifyOtpSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { ccode, mobile, otp } = req.body;
    if (!ccode || !mobile || !otp) {
        return res.status(403).json({ message: "All Fields Required!" });
    }

    try {
        const user = await User.findOne({ where: { mobile, ccode } });

        if (!user) {
            return res.status(401).json({
                ResponseCode: "401",
                message: "User not found!",
                success: false,
            });
        }

        // Debugging step to check what is actually stored in DB
        console.log("Stored OTP:", user.otp);
        console.log("User OTP Expiry:", user.otpExpiresIn);

        if (String(user.otp) !== String(otp) || new Date() > new Date(user.otpExpiresIn)) {
            return res.status(401).json({ message: "Invalid or Expired OTP." });
        }

        const token = jwt.sign({ userId: user.id, mobile: user.mobile }, process.env.JWT_SECRET);
        await user.update({ status: 1, otp: null, otpExpiresIn: null });

        const formattedDate = user.registartion_date
            ? new Date(user.registartion_date).toISOString().replace("T", " ").split(".")[0]
            : null;

        return res.status(200).json({
            message: "OTP Verified Successfully!",
            token,
            user: {
                id: user.id,
                mobile: user.mobile,
                email: user.email,
                ccode: user.ccode,
                registartion_date: formattedDate,
            },
        });
    } catch (error) {
        console.log("Error Verifying OTP.", error.message);
        res.status(500).json({ message: "Error Verifying OTP: " + error.message });
    }
});


const verifyMobile = asyncHandler(async (req, res) => {
    const { mobile } = req.body;

    if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required!" });
    }

    try {
        const userRecord = await admin.auth().getUserByPhoneNumber(mobile);
        
        if (!userRecord) {
            return res.status(404).json({ message: "Mobile number not found!" });
        }

        const token = jwt.sign(
            { userId: userRecord.uid, mobile: userRecord.phoneNumber },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Mobile number verified successfully!",
            mobile: userRecord.phoneNumber,
            token,
        });
    } catch (error) {
        console.error("Error verifying mobile number:", error.message);

        if (error.code === "auth/user-not-found") {
            return res.status(404).json({ message: "Mobile number not found!" });
        }

        return res.status(500).json({ message: "Error verifying mobile number: " + error.message });
    }
});


const verifyEmail = asyncHandler(async(req,res)=>{
    const {email}=req.body;
    if(!email){
        return res.status(400).json({message:"Email Id required."})
    }
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        if(!userRecord){
            return res.status(404).json({message:"Email is not found!"});
        }
        const token = jwt.sign({uid:userRecord.uid,email:userRecord.email},process.env.JWT_SECRET)
        return res.status(200).json({
            message: "Email id verified successfully!",
            mobile: userRecord.email,
            token
        });
    } catch (error) {
        console.error("Error verifying email:", error.message);
        if (error.code === "auth/user-not-found") {
            return res.status(404).json({ message: "Email not found!" });
        }
        return res.status(500).json({ message: "Error verifying email: " + error.message });
    }
})


const acountDelete = asyncHandler(async(req,res)=>{
    
})

module.exports = {otpLogin,verifyOtp,verifyMobile,verifyEmail}