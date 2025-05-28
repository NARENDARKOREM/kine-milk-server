const Setting = require("../../Models/Setting")




const getsetting = async (req, res)=>{
    try {
        const setting = await Setting.findOne({
            attributes:[
"store_charges","delivery_charges","tax"
            ]
        });

        if(!setting){
            return res.status(404).json({ResponseMsg:"Setting not found"});
        }

        return res.status(200).json({
            ResponseCode: "200",
            Result: "true",
            ResponseMsg: "settings fetched successfully!",
            setting
          });
    } catch (error) {
        return res.status(500).json({
            ResponseCode: "500",
            Result: "true",
            ResponseMsg: "Internal Server Error",
            error
          }); 
    }
}

module.exports = {
    getsetting
}