const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Store = sequelize.define(
  "Store",
  {
   id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rimg: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rate: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    slogan: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tags:{
      type:DataTypes.TEXT,
      allowNull:true,
    },
    lcode: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    catid: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    full_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    landmark: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    lats: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    longs: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // store_charge: {
    //   type: DataTypes.FLOAT,
    //   allowNull: false,
    // },
    // dcharge: {
    //   type: DataTypes.FLOAT,
    //   allowNull: true,
    // },
    // morder: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
    // commission: {
    //   type: DataTypes.FLOAT,
    //   allowNull: false,
    // },
    // bank_name: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    // ifsc: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    // receipt_name: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    // acc_number: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    // paypal_id: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    // upi_id: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rstatus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sdesc: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // charge_type: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    // ukm: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: null,
    // },
    // uprice: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: null,
    // },
    // aprice: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: null,
    // },
    // zone_id: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    // },
    cover_img: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    slogan_title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    cdesc: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    opentime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    closetime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    cancle_policy: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_pickup: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    owner_name:{
      type:DataTypes.TEXT,
      allowNull:false
    },
    one_subscription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { tableName: "tbl_store", timestamps: true, paranoid: true }
);

module.exports = Store;