const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const PaymentList = sequelize.define(
  "PaymentList",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    img: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    attributes: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    subtitle: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    p_show: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: "tbl_payment_list", timestamps: true, paranoid: true }
);

module.exports = PaymentList;
