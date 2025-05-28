const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const StoreWeightOption = sequelize.define(
  "StoreWeightOption",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    product_inventory_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    weight_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1,
    },
    subscription_quantity: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    tableName: "tbl_storeWeightOption",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = StoreWeightOption;