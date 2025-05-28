const express = require('express');
const { upsertCart, getCartByUser, deleteCart } = require('../../UserControllers/customer/cart_controller');
const { isAuthenticated } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.post("/",isAuthenticated,upsertCart);
router.get("/:orderType",isAuthenticated, getCartByUser);
router.delete("/:id",isAuthenticated, deleteCart);


module.exports = router;