const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Ads = sequelize.define(
  "Ads",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    screenName: {
      type: DataTypes.ENUM(
        "homescreen",
        "categories",
        "refer_and_earn",
        "order_status",
        "wallet"
      ),
      allowNull: false,
    },
    planType: {
      type: DataTypes.ENUM("instant", "subscribe"),
      allowNull: false,
    },
    img: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0 = unpublished, 1 = published
    },
    startDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    couponPercentage: {
      type: DataTypes.INTEGER,
      allowNull: true, // Optional field
      validate: {
        min: 0, // Minimum value of 0%
        max: 100, // Maximum value of 100%
      },
    },
  },
  {
    tableName: "tbl_ads",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Ads;