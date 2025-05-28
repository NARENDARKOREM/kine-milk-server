const NorOrder=require("../Models/NormalOrder");
const {Op}=require("sequelize")
const asynHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const User = require("../Models/User")
const Rider = require("../Models/Rider");
const TimeSlot = require("../Models/Time")
const { getNorOrderIdBySchema, NorOrderDeleteSchema, NorOrderSearchSchema } = require("../utils/validation");

const getAllNorOrders = asynHandler(async (req, res, next) => {
  const { store_id, status } = req.params;

  // Define the valid statuses
  const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled', 'On Route'];

  try {
    // Validate store_id
    if (!store_id) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "store_id is required.",
      });
    }

    // Validate status
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: `Invalid status. Allowed statuses are: ${validStatuses.join(", ")}`,
      });
    }

    // Fetch orders with user details using include
    const NorOrders = await NorOrder.findAll({
      where: { store_id, status },
      include: [
        {
          model: User,  // Assuming User is the correct model name
          as: "user",   // Alias must match the one defined in the relationship
          attributes: ["id", "name"], // Select only needed fields
        },
        
          {
            model: Rider,  
            attributes: ["id", "title"], 
            as:"riders"
          },
          {
            model: TimeSlot,  
            attributes: ["id", "mintime","maxtime"], 
            as:"timeslot"
          }
        
        
      ],
    });

    logger.info(`Successfully fetched orders for store_id: ${store_id} with status: ${status}`);
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: `Fetched orders for store_id: ${store_id} with status: ${status}`,
      data: NorOrders,
    });
  } catch (error) {
    logger.error("Error fetching NormalOrders:", error);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error",
      details: error.message,
    });
  }
});




const getNorOrderCount=asynHandler(async(req,res)=>{
    const NorOrderCount=await NorOrder.count();
    const NorOrders=await NorOrder.findAll();
    logger.info("NorOrders",NorOrderCount)
    res.status(200).json({NorOrders,NorOrder:NorOrderCount})
});

const getNorOrderById=asynHandler(async(req,res)=>{
    const {error}=getNorOrderIdBySchema.validate(req.params)
    if (error) {
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
    }

    const {id}=req.params;
    console.log(id)
    const NorOrderDetails=await NorOrder.findOne({where:{id:id}});
    if(!NorOrderDetails){
        logger.error('NorOrder not found')
        return res.status(404).json({error:"NorOrder not found"})
    }
    logger.info("NorOrder found");
    res.status(200).json(NorOrderDetails)
});

const deleteNorOrder = asynHandler(async (req, res) => {
    const dataToValidate = { ...req.params, ...req.body };
    const {error}=NorOrderDeleteSchema.validate(dataToValidate)
    if (error) {
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
      }
    const { id } = req.params;
    const { forceDelete } = req.body;

        const NorOrderDel = await NorOrder.findOne({ where: { id }, paranoid: false });

        if (!NorOrderDel) {
            logger.error("NorOrder not found");
            return res.status(404).json({ error: "NorOrder not found" });
        }

        if (NorOrderDel.deletedAt && forceDelete !== "true") {
            logger.error("NorOrder is already soft-deleted");
            return res.status(400).json({ error: "NorOrder is already soft-deleted. Use forceDelete=true to permanently delete it." });
        }

        if (forceDelete === "true") {
            await NorOrderDel.destroy({ force: true });
            logger.info("NorOrder permanently deleted");
            return res.status(200).json({ message: "NorOrder permanently deleted successfully" });
        }

        await NorOrderDel.destroy();
        logger.info("NorOrder soft-deleted");
        return res.status(200).json({ message: "NorOrder soft deleted successfully" });
});

const searchNorOrder=asynHandler(async(req,res)=>{
    const {error}=NorOrderSearchSchema.validate(req.body);
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

        const NorOrder=await NorOrder.findAll({where:whereClause});

        if(NorOrder.length === 0){
            logger.error("No matching admins found")
            return res.status(404).json({ error: "No matching admins found" });
        }
        logger.info("NorOrders found ")
        res.status(200).json(NorOrder)
});

const seAllDetails = async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
  
    try {
      if (!id || !status) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'Both ID and status are required to fetch Normal Order details.' 
        });
      }
  
      // Fetch booking details
      const NormalOrderFetch = await TblBook.findOne({
        where: { id, status: status }, 
        include: [
          {
            model: User,
            as: 'User', 
            attributes: ['id', 'name', 'email', 'mobile'], 
          },
          {
            model: Property,
            as: 'properties',
            attributes: ['id', 'title', 'address', 'price', 'image'],
          },
        ],
      });
  
      // Handle case when no booking is found
      if (!NormalOrderFetch) {
        return res.status(404).json({ 
          error: 'Not Found', 
          message: `No booking found with ID '${id}' and status '${status}'.` 
        });
      }
  
      // Return booking details
      return res.status(200).json({
        message: 'Booking details fetched successfully.',
        data: NormalOrderFetch, 
      });
  
    } catch (error) {
      // Handle specific error types (example: Sequelize or database errors)
      if (error.name === 'SequelizeDatabaseError') {
        return res.status(400).json({ 
          error: 'Database Error', 
          message: 'Invalid query or database operation. Please check your request.' 
        });
      }
  
      // Catch-all for unexpected errors
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Something went wrong while fetching booking details. Please try again later.', 
        details: error.message 
      });
    }
  };

module.exports={
    getAllNorOrders,
    getNorOrderCount,
    getNorOrderById,
    deleteNorOrder,
    searchNorOrder,
    seAllDetails
}