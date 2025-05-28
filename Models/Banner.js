const sequelize = require("../config/db");
const {DataTypes} = require('sequelize');

const Banner = sequelize.define(
  "Banner",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    img: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    planType: {
      type: DataTypes.ENUM("instant", "subscribe"),
      allowNull: false,
      defaultValue: "instant",
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0 = unpublished, 1 = published, 2 = scheduled
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true, // Required for status = 2 (scheduled)
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true, // Required for status = 1 (published) or 2 (scheduled)
    },
  },
  { tableName: "banner", timestamps: true, paranoid: true }
);

module.exports = Banner;