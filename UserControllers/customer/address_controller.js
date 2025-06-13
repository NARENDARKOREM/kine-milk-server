const { where } = require("sequelize");
const Address = require("../../Models/Address");
const Person = require("../../Models/PersonRecord");
const sequelize = require("../../config/db");
const PersonRecord = require("../../Models/PersonRecord");



const upSertAddress = async (req, res) => {
    try {
      const { id,  lats, longs, address, landmark, r_instruction, a_type,mobile,name } = req.body;
      const uid = req.user.userId;

      console.log(uid)
      
      
      if (!uid || !lats || !longs || !address || !a_type) {
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Missing required fields!",
        });
      }
  
      if (id) {
        
        const existingAddress = await Address.findByPk(id);
  
        if (!existingAddress) {
          return res.status(404).json({
            ResponseCode: "404",
            Result: "false",
            ResponseMsg: "Address not found!",
          });
        }
  
        
        await Address.update(
          {
            uid:uid,
            a_lat: lats,
            a_long: longs,
            address,
            landmark,
            r_instruction,
            a_type,
          },
          { where: { id } }
        );

        await Person.update(
        {
          name,
          mobile,
          
        },
        { where: {address_id:id } }
      );

  
        return res.status(200).json({
          ResponseCode: "200",
          Result: "true",
          ResponseMsg: "Address Updated Successfully!",
          data: existingAddress,
        });
      } else {
        // Create a new address
        const newAddress = await Address.create({
          uid:uid,
          a_lat: lats,
          a_long: longs,
          address,
          landmark,
          r_instruction,
          a_type,
        });

        await Person.create({
          name: name,
          mobile: mobile,
          address_id: newAddress.id,
        });
  
        return res.status(200).json({
          ResponseCode: "200",
          Result: "true",
          ResponseMsg: "Address Saved Successfully!",
          data: newAddress,
        });
      }
    } catch (error) {
      console.error("Error processing address:", error);
      res.status(500).json({
        ResponseCode: "500",
        Result: "false",
        ResponseMsg: "Server Error",
        error: error.message,
      });
    }
  };
  
  

 const getAddress = async (req, res) => {

    const uid = req.user.userId;

    
    try {
      const addresses = await Address.findAll({where:{uid:uid},include:[{model:Person,as:'personaddress'}]});
      res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Address Retrieved Successfully!",
        data: addresses,
      });
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

const deleteAddress = async (req, res) => {
  const uid = req.user?.userId;
  const { addressId } = req.params;
  console.log(uid, "userid", addressId, "address id");

  // Validate user
  if (!uid) {
    return res.status(401).json({
      ResponseCode: "401",
      Result: "false",
      ResponseMsg: "Unauthorized: User not found!",
    });
  }

  // Validate addressId
  if (!addressId) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Address ID is required!",
    });
  }

  let transaction;

  try {
    transaction = await sequelize.transaction();

    // Find the address
    const findAddress = await Address.findOne({
      where: { id: addressId, uid },
      transaction,
    });

    if (!findAddress) {
      await transaction.rollback();
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Address Not Found",
      });
    }

    // Delete associated PersonRecord entries
    const deletedPersonRecords = await PersonRecord.destroy({
      where: { address_id: addressId },
      transaction,
    });
    console.log(`Deleted ${deletedPersonRecords} PersonRecord entries for address_id: ${addressId}`);

    // Delete the address
    await Address.destroy({
      where: { id: addressId, uid },
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Address and associated person records deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting address and person records:", error);
    if (transaction) await transaction.rollback();
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


  module.exports = {
    upSertAddress,
    getAddress,
    deleteAddress
  }