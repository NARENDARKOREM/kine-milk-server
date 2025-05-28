const sequelize = require('../config/db');
const {DataTypes, UUID}=require('sequelize');

const PersonRecord = sequelize.define('tbl_person_record',{
    id:{
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name:{
        type:DataTypes.TEXT,
        allowNull:true
    },
    email:{
        type:DataTypes.TEXT,
        allowNull:true
    },
    mobile:{
        type:DataTypes.TEXT,
        allowNull:true
    },
    address_id:{
        type:DataTypes.UUID,
        allowNull:true
    },
    order_id:{
        type:DataTypes.UUID,
        allowNull:true
    }
},{tableName:'tbl_person_record',paranoid:true,timestamps:true})

module.exports = PersonRecord;