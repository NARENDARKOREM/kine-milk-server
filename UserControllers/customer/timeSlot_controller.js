const Store = require("../../Models/Store");
const Time = require("../../Models/Time");


const getTimeSlotByStore =async (req, res)=>{
    const {store_id} = req.params;
    try {

        if (!store_id ) {
            return res.status(400).json({
              ResponseCode: "400",
              Result: "false",
              ResponseMsg: "Store Id is Required!",
            });
          }

          const store = await Store.findByPk(store_id);

          if(!store){
            return res.status(404).json({
                ResponseCode: "404",
                Result: "false",
                ResponseMsg: "Store Not Found!",
              });
          }


          const timeslotlist = await Time.findAll({where:{store_id:store_id,status:1},attributes:["id","mintime","maxtime"]});

          return res.json({
            ResponseCode: "200",
            Result: "true",
            ResponseMsg: "TimeSlot Get Successfully!",
            timeslotlist
        });
        
    } catch (error) {
        console.error("Error fetching TimeSlot:", error);
        return res.status(500).json({
            ResponseCode: "500",
            Result: "false",
            ResponseMsg: "Internal Server Error"
        });
    }
}


module.exports={
    getTimeSlotByStore
}