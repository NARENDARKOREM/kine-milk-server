const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");


const ProductReview = sequelize.define(
  "tbl_product_reivews",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id:{
        type: DataTypes.UUID,
        allowNull: false,
    },
    product_id:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    store_id:{
      type:DataTypes.UUID,
      allowNull:false
    },
    order_id:{
      type:DataTypes.UUID,
      allowNull:false
    },
    category_id:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    review: {
        type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "tbl_product_reviews",
    timestamps: true,
    paranoid: true,
  }
);


module.exports = ProductReview;

