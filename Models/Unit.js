const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Unit = sequelize.define(
  "Unit",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["kg", "g", "mg", "t", "µg", "L", "mL", "cm³", "dm³", "m³"]],
      },
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue:1,
      validate: {
        isIn: [[0, 1]],
      },
    },
  },
  { tableName: "tbl_unit", timestamps: true, paranoid: true, underscored: true }
);

module.exports = Unit;
