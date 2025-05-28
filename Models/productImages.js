const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");
const Product = require("./Product"); 

const ProductImage = sequelize.define(
  "ProductImage",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Product, 
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    img: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    deletedAt: {
      type: DataTypes.DATE, // Needed when `paranoid: true`
      allowNull: true,
    },
  },
  {
    tableName: "tbl_product_images",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = ProductImage;
