const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Milk = sequelize.define(
  "Milk",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    data: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
  },
  { tableName: "tbl_milk", timestamps: true, paranoid: true }
);

module.exports = Milk;
