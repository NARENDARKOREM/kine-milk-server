const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const FAQ = sequelize.define(
  "FAQ",
  {
   id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: "tbl_faq", timestamps: true, paranoid: true }
);

module.exports = FAQ;
