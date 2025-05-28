const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const WeightOption = sequelize.define(
  "WeightOption",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    weight: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subscribe_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    normal_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    mrp_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    tableName: "tbl_WeightOption",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = WeightOption;