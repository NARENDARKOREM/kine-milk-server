const logger = require("../utils/logger");

const asynHandler=(fn)=>{
    return (req,res,next)=>{
        Promise.resolve(fn(req,res,next)).catch((error)=>{
            console.error("Error",error);
            logger.error('Internal Server Error')
            res.status(500).json({ message: "Internal Server Error" })
        })
    }
}

module.exports=asynHandler