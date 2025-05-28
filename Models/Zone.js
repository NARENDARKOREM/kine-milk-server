const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Zone = sequelize.define(
  "Zone",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    coordinates: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    alias: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  { tableName: "zones", timestamps: true, paranoid: true }
);

module.exports = Zone;
