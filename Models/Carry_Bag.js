const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const CarryBag = sequelize.define(
  "CarryBag",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    planType: {
      type: DataTypes.ENUM("Instant", "Subscribe"),
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0 = unpublished, 1 = published
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0, // Cost cannot be negative
      },
    },
    bagImage: {
      type: DataTypes.STRING,
      allowNull: true, // Optional image URL
    },
  },
  {
    tableName: "tbl_carry_bags",
    timestamps: true,
    paranoid: true, // Enable soft deletion
  }
);

module.exports = CarryBag;