const { Op } = require("sequelize");
const CarryBag = require("../../Models/Carry_Bag");
const Setting = require("../../Models/Setting");


const getCharges = async(req,res)=>{
    try {
        const charges = await Setting.findOne({
            attributes:['delivery_charges','store_charges','tax','delivery_charge_status'],
        })
        const carryBagCharges = await CarryBag.findAll({
            where:{status:1},
            attributes:['planType','cost']
        })
        if (carryBagCharges) {
            charges.dataValues.carryBagCharges = carryBagCharges;
        }
        // If no charges found, return a 404 response
        if (!charges) {
            return res.status(404).json({
                message: "Charges not found",
            });
        }
        res.status(200).json({
            message:"Charges fetched successfully",
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

const getCarryBags = async(req,res)=>{
    try {
        const carryBags = await CarryBag.findAll({
            where: { status: 1 },
            attributes: ['id', 'planType', 'cost', 'bagImage','status'],
        });
        if (!carryBags || carryBags.length === 0) {
            return res.status(404).json({
                message: "No carry bags found",
            });
        }
        res.status(200).json({
            message: "Carry bags fetched successfully",
            data: carryBags,
        });
    } catch (error) {
        console.error("Error in getCarryBags:", error);
        res.status(500).json({
            message: "Server error while fetching carry bags",
            error: error.message,
        });
    }
}

module.exports = {getCharges, getCarryBags};