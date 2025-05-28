const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const PayoutSetting = sequelize.define(
  "PayoutSetting",
  {
   id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amt: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    r_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    r_type: {
      type: DataTypes.ENUM("UPI", "BANK Transfer", "Paypal"),
      allowNull: false,
    },
    acc_number: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    bank_name: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    acc_name: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    ifsc_code: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    upi_id: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    paypal_id: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
  },
  { tableName: "payout_setting", timestamps: true, paranoid: true }
);

module.exports = PayoutSetting;
