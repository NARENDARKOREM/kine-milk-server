const express  = require('express');
const {subscribeOrder, getOrdersByStatus, getOrderDetails, cancelOrder,pauseSubscriptionOrder,autoResumeSubscriptionOrder, editSubscriptionOrder, resumeSubscriptionOrder} = require('../../UserControllers/customer/subscribeOrder_controller');
const authMiddleware = require('../../middlewares/authMiddleware');



const router = express.Router();

router.post("/",authMiddleware.isAuthenticated, subscribeOrder);
router.patch("/edit",authMiddleware.isAuthenticated,editSubscriptionOrder);
router.get("/status/:status",authMiddleware.isAuthenticated,getOrdersByStatus);
router.get("/:id",authMiddleware.isAuthenticated,getOrderDetails);
router.post("/cancel",authMiddleware.isAuthenticated,cancelOrder);
router.put("/pause-order",authMiddleware.isAuthenticated,pauseSubscriptionOrder);
router.put("/resume-order",authMiddleware.isAuthenticated,resumeSubscriptionOrder);
// router.put("/auto-resume-order",authMiddleware.isAuthenticated,autoResumeSubscriptionOrder);

module.exports = router;