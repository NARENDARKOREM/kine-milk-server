const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Photo = sequelize.define(
  "Photo",
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
    img: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: "tbl_photo", timestamps: true, paranoid: true }
);

module.exports = Photo;
