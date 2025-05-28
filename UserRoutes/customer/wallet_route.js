const express = require('express');

const router = express.Router();

const authMiddleware = require('../../middlewares/authMiddleware');
const { getWallet, updateWallet,WalletReportHistory, walletAmountSuggestions } = require('../../UserControllers/customer/wallet_controller');

router.get("/",authMiddleware.isAuthenticated,getWallet);

router.post("/",authMiddleware.isAuthenticated,updateWallet);
router.get("/history",authMiddleware.isAuthenticated,WalletReportHistory);
router.get("/suggestions",authMiddleware.isAuthenticated,walletAmountSuggestions)

module.exports = router;


