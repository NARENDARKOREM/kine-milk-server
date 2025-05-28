const Setting = require("../../Models/Setting");


const getCharges = async(req,res)=>{
    try {
        const charges = await Setting.findOne({
            attributes:['delivery_charges','store_charges','tax'],
        })
        if (!charges) {
            return res.status(404).json({
                message: "Charges not found",
            });
        }
        res.status(200).json({
            message:"Charges fetchd successfully",
            data: charges,
        })
    } catch (error) {
        console.error("Error in getCharges:", error);
        res.status(500).json({
            message: "Server error while fetching charges",
            error: error.message,
        });
        
    }
}

module.exports = {getCharges};