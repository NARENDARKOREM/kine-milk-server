const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Coupon = sequelize.define(
  "Coupon",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    coupon_img: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true, // Required for status = 2 (Scheduled)
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true, // Required for status = 1 (Published) or 2 (Scheduled)
    },
    min_amt: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    coupon_val: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    coupon_code: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    coupon_title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0 = unpublished, 1 = published, 2 = scheduled
    },
  },
  { tableName: "tbl_coupon", timestamps: true, paranoid: true }
);

module.exports = Coupon;