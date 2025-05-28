const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");


const Address = sequelize.define(
  "Address",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false, 
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    uid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    landmark: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    r_instruction: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    a_type: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    a_lat: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    a_long: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  { tableName: "tbl_address", timestamps: true, paranoid: true }
);

module.exports = Address;
