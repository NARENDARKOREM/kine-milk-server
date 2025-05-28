const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const Admin = sequelize.define('Admin',{
    id:{
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull:false
    },
    email:{ 
        type: DataTypes.STRING,
        allowNull: false
    },
    password:{
        type: DataTypes.STRING,
        allowNull: false
    }
},{tableName: 'admin', timestamps: true,paranoid:true});

module.exports = Admin;