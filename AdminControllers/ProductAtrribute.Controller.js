const ProductAttribute=require("../Models/ProductAttribute");
const {Op}=require("sequelize")
const asynHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const { getProductAttributeByIdSchema, ProductAttributeDeleteSchema, ProductAttributeSearchSchema, } = require("../utils/validation");

const upsertProductAttribute = async (req, res) => {
  try {
    const {
      id,
      product_id,
      subscribe_price,
      normal_price,
      title,
      discount,
      out_of_stock,
      subscription_required,
    } = req.body;
    const store_id = 1; 

    console.log("Request body:", req.body);

    // Validate required fields
    if (
      !title ||
      !product_id ||
      !subscribe_price ||
      !normal_price ||
      discount === undefined ||
      out_of_stock === undefined ||
      subscription_required === undefined
    ) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg:
          "Title, product_id, subscribe_price, normal_price, discount, out_of_stock, and subscription_required are required.",
      });
    }

    let productAttrbt;

    if (id) {
      // Find Product Attribute by ID
      productAttrbt = await ProductAttribute.findByPk(id);

      if (!productAttrbt) {
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Product attribute not found.",
        });
      }

      // Update Product Attribute fields
      await productAttrbt.update({
        product_id,
        subscribe_price,
        normal_price,
        title,
        discount,
        out_of_stock,
        subscription_required,
        store_id,
      });

      console.log("Product attribute updated successfully:", productAttrbt);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Product attribute updated successfully.",
        productAttrbt,
      });
    }

    productAttrbt = await ProductAttribute.create({
      product_id,
      subscribe_price,
      normal_price,
      title,
      discount,
      out_of_stock,
      subscription_required,
      store_id,
    });

    console.log("Product attribute created successfully:", productAttrbt);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Product attribute created successfully.",
      productAttrbt,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
};

const getAllProductAttribute=asynHandler(async(req,res,next)=>{
    const getProductAttribute=await ProductAttribute.findAll();
    logger.info("sucessfully get all ProductAttribute");
    res.status(200).json(getProductAttribute);
});

const getProductAttributeCount=asynHandler(async(req,res)=>{
    const ProductAttributeCount=await ProductAttribute.count();
    const getProductAttribute=await ProductAttribute.findAll();
    logger.info("ProductAttribute",ProductAttributeCount)
    res.status(200).json({getProductAttribute,ProductAttribute:ProductAttributeCount})
});

const getProductAttributeById=asynHandler(async(req,res)=>{
    const {error}=getProductAttributeByIdSchema.validate(req.params)
    if (error) {
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
    }

    const {id}=req.params;
    const ProductAttributegetById=await ProductAttribute.findOne({where:{id:id}});
    if(!ProductAttributegetById){
        logger.error('ProductAttribute not found')
        return res.status(404).json({error:"ProductAttribute not found"})
    }
    logger.info("ProductAttribute found");
    res.status(200).json(ProductAttributegetById)
});

const deleteProductAttribute = asynHandler(async (req, res) => {
    const dataToValidate={...req.params,...req.body}
    const {error}=ProductAttributeDeleteSchema.validate(dataToValidate)
    if (error) {
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
      }
    const { id } = req.params;
    const { forceDelete } = req.body;

        const getProductAttributeById = await ProductAttribute.findOne({ where: { id }, paranoid: false });

        if (!getProductAttributeById) {
            logger.error("ProductAttribute not found");
            return res.status(404).json({ error: "ProductAttribute not found" });
        }

        if (getProductAttributeById.deletedAt && forceDelete !== "true") {
            logger.error("ProductAttribute is already soft-deleted");
            return res.status(400).json({ error: "ProductAttribute is already soft-deleted. Use forceDelete=true to permanently delete it." });
        }

        if (forceDelete === "true") {
            await getProductAttributeById.destroy({ force: true });
            logger.info("ProductAttribute permanently deleted");
            return res.status(200).json({ message: "ProductAttribute permanently deleted successfully" });
        }

        await getProductAttributeById.destroy();
        logger.info("ProductAttribute soft-deleted");
        return res.status(200).json({ message: "ProductAttribute soft deleted successfully" });
});

const searchProductAttribute=asynHandler(async(req,res)=>{
    const {error}=ProductAttributeSearchSchema.validate(req.body);
    if(error){
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
    }
    const {id,title}=req.body;
        const whereClause={};
        if(id){
            whereClause.id=id;
        }

        if(title && title.trim()!=""){
            whereClause.title={[Sequelize.Op.like]: `%${title.trim()}%`};
        }

        const ProductAttribute=await ProductAttribute.findAll({where:whereClause});

        if(ProductAttribute.length === 0){
            logger.error("No matching admins found")
            return res.status(404).json({ error: "No matching admins found" });
        }
        logger.info("ProductAttribute found ")
        res.status(200).json(ProductAttribute)
});

const toggleproductAttributeStatus = async (req, res) => {
  console.log("Request received:", req.body);

  const { id, value } = req.body;

  try {
    const productattr = await ProductAttribute.findByPk(id);

    if (!productattr) {
      console.log("product not found");
      return res.status(404).json({ message: "product not found." });
    }

    productattr.status = value;
    await productattr.save();

    console.log("product updated successfully:", productattr);
    res.status(200).json({
      message: "product status updated successfully.",
      updatedStatus: productattr.status,
    });
  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports={
    upsertProductAttribute,
    getAllProductAttribute,
    getProductAttributeCount,
    getProductAttributeById,
    deleteProductAttribute,
    searchProductAttribute,
    toggleproductAttributeStatus
}