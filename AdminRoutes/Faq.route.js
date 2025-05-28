const express=require("express")
const router=express.Router();
const faqController=require("../AdminControllers/Faq.Controller");
const adminMiddleware = require('../middlewares/adminMiddleware');

router.post("/upsert", adminMiddleware.isAdmin,faqController.upsertFaq); //1
router.get("/all",adminMiddleware.isAdmin,faqController.getAllFaqs) //1
router.get("/getbyid/:id",adminMiddleware.isAdmin,faqController.getFaqById) //1

router.delete("/delete/:id",adminMiddleware.isAdmin,faqController.deleteFaq)
router.get("/count",adminMiddleware.isAdmin,faqController.getFaqCount) //1

router.patch("/toggle-status",adminMiddleware.isAdmin,faqController.toggleFaqStatus);


module.exports=router