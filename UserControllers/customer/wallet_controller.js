const Setting = require("../../Models/Setting");
const User = require("../../Models/User");
const WalletReport = require("../../Models/WalletReport");

const getWallet = async (req, res) => {
  const userId = req.user.userId;

  try {
    if (!userId) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "User ID not provided",
      });
    }

    const wallet = await User.findOne({
      where: { id: userId },
      attributes: ["id", "wallet"],
    });

    if (!wallet) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User not found",
      });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Wallet details fetched successfully",
      wallet: wallet,
    });
  } catch (error) {
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
};

const updateWallet = async (req, res) => {
  const userId = req.user.userId;
  const { amount, message, transaction_no } = req.body;

  try {
    // Validation
    if (!userId || !transaction_no || !amount) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "User ID, transaction number, and amount are required",
      });
    }

    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "User not found",
      });
    }

    user.wallet = (user.wallet || 0) + amount;
    await user.save();

    const walletReport = await WalletReport.create({
      tdate: new Date(),
      uid: userId,
      amt: amount,
      message: message || "Wallet credited",
      transaction_no,
      transaction_type: "Credited",
    });

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Wallet updated successfully",
      walletReport,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
};

const WalletReportHistory = async (req, res) => {
  const uid = req.user.userId;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized: User not found!" });
  }
  try {
    const walletHistory = await WalletReport.findAll({
      where: { uid: uid },
      order: [["createdAt", "DESC"]],
    });
    if (!walletHistory || walletHistory.length === 0) {
      return res.status(404).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No wallet history found!",
      });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Wallet history fetched successfully!",
      walletHistory,
    });
  } catch (error) {
    console.log("Error fetching wallet history: ", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error",
    });
  }
};

const walletAmountSuggestions = async (req, res) => {
  try {
    const walletAmtSuggestion = await Setting.findOne({
      attributes: ["wallet_amt_suggestions"],
    });

    if (
      !walletAmtSuggestion ||
      !walletAmtSuggestion.wallet_amt_suggestions
    ) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Not found wallet suggestions!",
      });
    }

    let suggestions;
    try {
      // Log raw data for debugging
      console.log("Raw wallet_amt_suggestions:", walletAmtSuggestion.wallet_amt_suggestions);

      // Handle potential double-stringified JSON
      let rawData = walletAmtSuggestion.wallet_amt_suggestions;
      
      // If the data is a string, try parsing it
      if (typeof rawData === "string") {
        // Remove any leading/trailing quotes if present
        rawData = rawData.trim().replace(/^"|"$/g, "");
        suggestions = JSON.parse(rawData);
      } else {
        // If already an array, use it directly
        suggestions = rawData;
      }

      // Ensure suggestions is an array of numbers
      if (!Array.isArray(suggestions) || !suggestions.every(num => typeof num === "number")) {
        throw new Error("Invalid wallet suggestions format");
      }

      console.log("Parsed suggestions:", suggestions);
    } catch (parseError) {
      console.error("Error parsing wallet suggestions:", parseError);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Invalid wallet suggestions format in database!",
      });
    }

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Wallet Suggestion amount fetched successfully!",
      walletAmtSuggestion: suggestions,
    });
  } catch (error) {
    console.error("Error fetching wallet suggestions:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getWallet,
  updateWallet,
  WalletReportHistory,
  walletAmountSuggestions
};
