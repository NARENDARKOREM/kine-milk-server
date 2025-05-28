const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ccode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    img: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refercode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parentcode: {
      type: DataTypes.TEXT,
      defaultValue: false,
    },
    password: {
      type: DataTypes.TEXT,
      defaultValue: true,
    },
    registartion_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    wallet: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    one_subscription:{
      type:DataTypes.TEXT,
      allowNull:true
    },
  },
  { tableName: "tbl_user", timestamps: true, paranoid: true }
);

module.exports = User;
