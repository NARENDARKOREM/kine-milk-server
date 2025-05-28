const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Rider = sequelize.define(
  "Rider",
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
    title: {
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
    password: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    img: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    rdate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    one_subscription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ride_timeslots: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [], // Default to empty array
    },
    rider_status: {
      type: DataTypes.ENUM(
        'available',
        'unavailable',
        'product delivered',
        'not delivered',
        'order assigned'
      ),
      allowNull: false,
      defaultValue: 'unavailable',
    },
  },
  { tableName: "tbl_rider", timestamps: true, paranoid: true }
);

module.exports = Rider;