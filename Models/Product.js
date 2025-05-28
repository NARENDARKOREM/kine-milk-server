const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cat_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    img: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    out_of_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subscription_required: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    discount: {
      type: DataTypes.FLOAT, // Use FLOAT for percentage values
      allowNull: true, // Optional field
      defaultValue: 0, // Default to 0 if not provided
    },
    package_type: {
      type: DataTypes.ENUM('tetra_pack', 'bottle', 'pouch', 'box'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['tetra_pack', 'bottle', 'pouch', 'box']],
          msg: 'Invalid package type. Must be one of: tetra_pack, bottle, pouch, box',
        },
      },
    },
    batch_number:{
      type:DataTypes.FLOAT,
      allowNull:false,
      validate: {
        is: {
          args: /^[A-Za-z0-9-]+$/i,
          msg: 'Batch number must be alphanumeric with optional hyphens',
        },
        len: {
          args: [1, 50],
          msg: 'Batch number must be between 1 and 50 characters',
        },
      },
    }
  },
  {
    tableName: "tbl_product",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Product;