const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Delivery = sequelize.define(
  "Delivery",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      autoIncrement: false,
      primaryKey: true,
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    de_digit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: "tbl_delivery", timestamps: true, paranoid: true }
);

module.exports = Delivery;
