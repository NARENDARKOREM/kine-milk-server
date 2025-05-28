const express = require("express");
const router = express.Router();

const { getStoreWeightOptionList,getCurrentStoreWeightOptions,addStoreWeightOption,getProductInventory,editStoreWeightOption } = require("../AdminControllers/StoreWeightOption.controller");

router.get("/getproductinv/:id", getProductInventory);
router.post("/add", addStoreWeightOption);
router.get("/list", getStoreWeightOptionList);
router.get("/current/:product_inventory_id", getCurrentStoreWeightOptions);


module.exports = router;