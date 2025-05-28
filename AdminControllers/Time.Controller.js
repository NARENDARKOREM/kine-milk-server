const Time=require("../Models/Time");
const {Op}=require("sequelize")
const asynHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const { upsertTimeSchema, getTimeIdBySchema, DeleteTimeSchema, TimeSearchSchema } = require("../utils/validation");

const upsertTime = async (req, res) => {
    // const {error}=await upsertTimeSchema.validate(req.body)
    // if(error){
    //     logger.error(`Validation error: ${error.message}`);
    //     return res.status(400).json({ success: false, message: error.message });
    // }
    const { id,mintime,maxtime,status } = req.body;
    const {store_id} = req.params
    console.log(req.body)
    try {
        if(id){
            const [rowsUpdated]=await Time.update({mintime,maxtime,status,store_id},{where:{id}}) 
            if(rowsUpdated ===0){
                logger.error("Time Record not found.")
                return res.status(404).json({ success: false, message: 'Record not found.' });
            }
            logger.info(`TimeRecord with ID ${id} updated successfully.`);
            return res.status(200).json({ success: true, message: 'TimeRecord updated successfully.' });
        }else{
            const newTime=await Time.create({mintime,maxtime,status,store_id});
            logger.info(`New Timerecord created with ID ${newTime.id}`);
            return res.status(200).json({ success: true, message: 'Timerecord created successfully.', data: newTime });
        }
    } catch (error) {
        console.error("Error fetching time slot:", error);
        return res.status(500).json({
            ResponseCode: "500",
            Result: "false",
            ResponseMsg: "Internal Server Error"
        }); 
    }

    
};

const getAllTimes = async (req, res, next) => {
    try {
        const { store_id } = req.params;

        if (!store_id) {
            return res.status(400).json({ message: "Store ID is required" });
        }

        const times = await Time.findAll({ where: { store_id } });

        if (!times || times.length === 0) {
            return res.status(404).json({ message: "No time slots found for this store" });
        }

        console.log("Successfully fetched all time slots");
        res.status(200).json(times);
        
    } catch (error) {
        console.error("Error fetching time slots:", error);
        next(error); // Pass error to the error-handling middleware
    }
};

const getTimeCount=asynHandler(async(req,res)=>{
    const TimeCount=await Time.count();
    const Times=await Time.findAll();
    logger.info("Times",TimeCount)
    res.status(200).json({Times,Time:TimeCount})
});

const getTimeById=asynHandler(async(req,res)=>{
    const {error}=getTimeIdBySchema.validate(req.params)
    if (error) {
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
    }

    const {id}=req.params;
    console.log(id)
    const TimeDetails=await Time.findOne({where:{id:id}});
    if(!TimeDetails){
        logger.error('Time not found')
        return res.status(404).json({error:"Time not found"})
    }
    logger.info("Time found");
    res.status(200).json(TimeDetails)
});

const deleteTime = asynHandler(async (req, res) => {
    const dataToValidate = { ...req.params, ...req.body };
    const {error}=DeleteTimeSchema.validate(dataToValidate)
    if (error) {
        logger.error(error.details[0].message)
        return res.status(400).json({ error: error.details[0].message });
      }
    const { id } = req.params;
    const { forceDelete } = req.body;

        const TimeDel = await Time.findOne({ where: { id }, paranoid: false });

        if (!TimeDel) {
            logger.error("Time not found");
            return res.status(404).json({ error: "Time not found" });
        }

        if (TimeDel.deletedAt && forceDelete !== "true") {
            logger.error("Time is already soft-deleted");
            return res.status(400).json({ error: "Time is already soft-deleted. Use forceDelete=true to permanently delete it." });
        }

        if (forceDelete === "true") {
            await TimeDel.destroy({ force: true });
            logger.info("Time permanently deleted");
            return res.status(200).json({ message: "Time permanently deleted successfully" });
        }

        await TimeDel.destroy();
        logger.info("Time soft-deleted");
        return res.status(200).json({ message: "Time soft deleted successfully" });
});

const searchTime=asynHandler(async(req,res)=>{
    const {error}=TimeSearchSchema.validate(req.body);
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

        const Time=await Time.findAll({where:whereClause});

        if(Time.length === 0){
            logger.error("No matching admins found")
            return res.status(404).json({ error: "No matching admins found" });
        }
        logger.info("Times found ")
        res.status(200).json(Time)
});
const toggleTimeStatus = async (req, res) => {
    console.log("Request received:", req.body);
    const { id, value } = req.body;
  
    try {
      const time = await Time.findByPk(id);
  
      if (!time) {
        logger.error("time not found");
        return res.status(404).json({ message: "time not found." });
      }
  
      time.status = value;
      await time.save();
  
      logger.info("time updated successfully:", time);
      res.status(200).json({
        message: "time status updated successfully.",
        updatedStatus: time.status,
      });
    } catch (error) {
      logger.error("Error updating time status:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }

module.exports={
    upsertTime,
    getAllTimes,
    getTimeCount,
    getTimeById,
    deleteTime,
    searchTime,
    toggleTimeStatus
}