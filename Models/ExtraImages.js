const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const ExtraImages = sequelize.define(
  "ExtraImages",
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
    mid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    img: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: "tbl_extra", timestamps: true, paranoid: true }
);

module.exports = ExtraImages;
