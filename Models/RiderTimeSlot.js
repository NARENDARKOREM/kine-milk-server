const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const RiderTimeSlot = sequelize.define(
  "RiderTimeSlot",
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
    mintime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    maxtime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: "rider_time_slots", timestamps: true, paranoid: true }
);

module.exports = RiderTimeSlot;