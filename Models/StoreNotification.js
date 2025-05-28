const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const StoreNotification = sequelize.define(
  "StoreNotification",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  { tableName: "tbl_snoti", timestamps: true, paranoid: true }
);

module.exports = StoreNotification;
