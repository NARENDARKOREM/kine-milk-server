const Delivery=require("../Models/Delivery");
const {Op}=require("sequelize")
const asynHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const { getDeliveryByIdSchema, DeliveryDeleteSchema, DeliverySearchSchema } = require("../utils/validation");

const upsertDelivery = async (req, res) => {
    try {
      const { id, title, status, de_digit } = req.body;
      const store_id=1;
      console.log("Request body:", req.body);
  
      // Validate required fields
      if (!title || !status  || !de_digit) {
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Title, status are required.",
        });
      }
  
      let delivery;
      if (id) {
        delivery = await Delivery.findByPk(id);
        if (!delivery) {
          return res.status(404).json({
            ResponseCode: "404",
            Result: "false",
            ResponseMsg: "delivery not found.",
          });
        }
  
        // Update delivery fields
        await delivery.update({
          title,
          status,
          de_digit,
          store_id
        });
  
        console.log("delivery updated successfully:", delivery);
        return res.status(200).json({
          ResponseCode: "200",
          Result: "true",
          ResponseMsg: "delivery updated successfully.",
          delivery,
        });
      } else {
          
        delivery = await Delivery.create({ title, status, de_digit,store_id });
  
        console.log("delivery created successfully:", delivery);
        return res.status(200).json({
          ResponseCode: "200",
          Result: "true",
          ResponseMsg: "delivery created successfully.",
          delivery,
        });
      }
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Internal Server Error",
      });
    }
  };

const getAllDelivery=asynHandler(async(req,res,next)=>{
    const DeliveryDetails=await Delivery.findAll();
    logger.info("sucessfully get all Delivery");
    res.status(200).json(DeliveryDetails);
});

const getDeliveryCount=asynHandler(async(req,res)=>{
    const DeliveryCount=await Delivery.count();
    const DeliveryAll=await Delivery.findAll();
    logger.info("Delivery",DeliveryCount)
    res.status(200).json({DeliveryAll,Delivery:DeliveryCount})
});

const getDeliveryById=asynHandler(async(req,res)=>{
    const {error}=getDeliveryByIdSchema.validate(req.params)
    if (error) {
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
    }

    const {id}=req.params;
    const DeliverybyId=await Delivery.findOne({where:{id:id}});
    if(!DeliverybyId){
        logger.error('Delivery not found')
        return res.status(404).json({error:"Delivery not found"})
    }
    logger.info("Delivery found");
    res.status(200).json(DeliverybyId)
});

const deleteDelivery = asynHandler(async (req, res) => {
    // const {error}=DeliveryDeleteSchema.validate(...req.params,...req.body)
    // if (error) {
    //     logger.error(error.details[0].message)
    //     return res.status(400).json({ error: error.details[0].message });
    //   }
    const { id } = req.params;
    const { forceDelete } = req.body;

        const DeliveryDelete = await Delivery.findOne({ where: { id }, paranoid: false });

        if (!DeliveryDelete) {
            logger.error("Delivery not found");
            return res.status(404).json({ error: "Delivery not found" });
        }

        if (DeliveryDelete.deletedAt && forceDelete !== "true") {
            logger.error("Delivery is already soft-deleted");
            return res.status(400).json({ error: "Delivery is already soft-deleted. Use forceDelete=true to permanently delete it." });
        }

        if (forceDelete === "true") {
            await DeliveryDelete.destroy({ force: true });
            logger.info("Delivery permanently deleted");
            return res.status(200).json({ message: "Delivery permanently deleted successfully" });
        }

        await DeliveryDelete.destroy();
        logger.info("Delivery soft-deleted");
        return res.status(200).json({ message: "Delivery soft deleted successfully" });
});

const searchDelivery=asynHandler(async(req,res)=>{
    const {error}=DeliverySearchSchema.validate(req.body);
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

        const Delivery=await Delivery.findAll({where:whereClause});

        if(Delivery.length === 0){
            logger.error("No matching admins found")
            return res.status(404).json({ error: "No matching admins found" });
        }
        logger.info("Delivery found ")
        res.status(200).json(Delivery)
});

const toggleDeliveryStatus = async (req, res) => {
    console.log("Request received:", req.body);
  
    const { id, value } = req.body;
  
    try {
      const delivery = await Delivery.findByPk(id);
  
      if (!delivery) {
        console.log("delivery not found");
        return res.status(404).json({ message: "delivery not found." });
      }
  
      delivery.status = value;
      await delivery.save();
  
      console.log("delivery updated successfully:", delivery);
      res.status(200).json({
        message: "delivery status updated successfully.",
        updatedStatus: delivery.status,
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  };

module.exports={
    upsertDelivery,
    getAllDelivery,
    getDeliveryCount,
    getDeliveryById,
    deleteDelivery,
    searchDelivery,
    toggleDeliveryStatus
}