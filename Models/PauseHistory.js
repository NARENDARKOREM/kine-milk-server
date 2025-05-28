const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Pause = sequelize.define(
  "Pause",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    subscribe_order_product_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    pause_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    pause_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  },
  {
    tableName: "tbl_pause_history", 
    timestamps: true,               
    paranoid: true                 
  }
);

module.exports = Pause;
