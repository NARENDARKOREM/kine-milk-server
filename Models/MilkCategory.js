const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const MilkCategory = sequelize.define(
  "MilkCategory",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
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
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    img: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  { tableName: "tbl_mcat", timestamps: true, paranoid: true }
);

module.exports = MilkCategory;
