const cron=require("node-cron");
const SubscribeOrderProduct = require("../../Models/SubscribeOrderProduct");
const { Op } = require("sequelize");


const runPauseResumeCron = async()=>{
    cron.schedule("0 0 * * *",async()=>{
        console.log("⏰ Running pause/resume cron at midnight");
    })

    const today=new Date();
    today.setHours(0,0,0,0,0)

    try {
        await SubscribeOrderProduct.update(
            {status:"Paused",pause:true},
            {
                where:{
                    
                    start_period:{[Op.lte]:today},
                    paused_period:{[Op.gte]:today},
                    status:{[Op.ne]:"Paused"}
                }
            }
        )

        //// Resume orders after pause period
        await SubscribeOrderProduct.update(
            {status:"Active"},
            {where:{
                pause:true,
                paused_period:{[Op.lt]:today},
                status:"Paused"
            }}
        )
        console.log("✅ Cron job completed successfully.");
    } catch (error) {
        console.error("❌ Error in cron job:", error.message);
    }
}

module.exports = runPauseResumeCron;