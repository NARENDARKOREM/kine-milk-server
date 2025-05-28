const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const ProductInventory = sequelize.define(
  "ProductInventory",
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
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    Coupons: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "tbl_productInventory",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = ProductInventory;