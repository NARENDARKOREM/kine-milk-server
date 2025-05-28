const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const RiderNotifiation = sequelize.define(
  "RiderNotifiation",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    rid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    msg: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  { tableName: "tbl_rnoti", timestamps: true, paranoid: true }
);

module.exports = RiderNotifiation;
