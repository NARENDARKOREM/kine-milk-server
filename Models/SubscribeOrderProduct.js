const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");
const Product = require("./Product");
const SubscribeOrder = require("./SubscribeOrder");
const Time = require("./Time");

const SubscribeOrderProduct = sequelize.define(
  "SubscribeOrderProduct",
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
      references: { model: SubscribeOrder, key: "id" },
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Product, key: "id" },
    },
    store_weight_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    start_period: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    paused_period: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    pause: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM("Pending", "Active", "Processing", "Completed", "Cancelled", "Paused"),
      allowNull: false,
      defaultValue: "Pending",
    },
    item_price:{
      type:DataTypes.FLOAT,
      allowNull: true
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    timeslot_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    repeat_day: {
      type: DataTypes.JSON,
    },
    schedule: { // it stored product quantity and days 
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidSchedule(value) {
          const allowedDays = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ];
          if (typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Schedule must be a valid JSON object");
          }
          for (const day in value) {
            if (!allowedDays.includes(day.toLowerCase())) {
              throw new Error(`Invalid day in schedule: ${day}`);
            }
            if (typeof value[day] !== "number" || value[day] < 0) {
              throw new Error(`Invalid quantity for ${day}: must be a positive number`);
            }
          }
        },
      },
    },
  },
  { tableName: "tbl_subscribe_order_product", timestamps: true, paranoid: true }
);

module.exports = SubscribeOrderProduct;
