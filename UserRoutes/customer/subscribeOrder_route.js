const express  = require('express');
const {subscribeOrder, getOrdersByStatus, getOrderDetails, cancelOrder,pauseSubscriptionOrder,autoResumeSubscriptionOrder, editSubscribeOrder, resumeSubscriptionOrder, cancelAllProductsInSubscriptionOrder} = require('../../UserControllers/customer/subscribeOrder_controller');
const authMiddleware = require('../../middlewares/authMiddleware');



const router = express.Router();

router.post("/",authMiddleware.isAuthenticated, subscribeOrder);
router.patch("/edit",authMiddleware.isAuthenticated,editSubscribeOrder);
router.get("/status/",authMiddleware.isAuthenticated,getOrdersByStatus);
router.get("/:id",authMiddleware.isAuthenticated,getOrderDetails);
//cancell particular order
router.post("/cancel",authMiddleware.isAuthenticated,cancelOrder);
//cancell alll products in order
router.put("/cancel-all",authMiddleware.isAuthenticated,cancelAllProductsInSubscriptionOrder)
router.put("/pause-order",authMiddleware.isAuthenticated,pauseSubscriptionOrder);
router.put("/resume-order",authMiddleware.isAuthenticated,resumeSubscriptionOrder);
// router.put("/auto-resume-order",authMiddleware.isAuthenticated,autoResumeSubscriptionOrder);

module.exports = router;