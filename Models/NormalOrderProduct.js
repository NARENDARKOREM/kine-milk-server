const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const NormalOrderProduct = sequelize.define(
  "NormalOrderProduct",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    oid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    weight_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    pquantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: "tbl_normal_order_product", timestamps: true, paranoid: true }
);

module.exports = NormalOrderProduct;