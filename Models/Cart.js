const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Cart = sequelize.define(
  "Cart",
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
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    weight_id:{
      type:DataTypes.UUID,
      allowNull:true
    },
    quantity: { 
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    orderType:{
      type: DataTypes.ENUM("Normal", "Subscription"),
      allowNull: false,
    }
  },
  { tableName: "tbl_cart", timestamps: true, paranoid: true }
);

module.exports = Cart;