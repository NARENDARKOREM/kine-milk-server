const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'mysql',
    dialectModule:require('mysql2'),
    port: process.env.DB_PORT ,
    timezone: process.env.TIMEZONE || "+05:30",

    logging:false, 

    pool: {
        max: 10, 
        min: 0,  
        acquire: 30000, 
        idle: 10000, 
      },
      dialectOptions: {
        timezone: "+05:30",
        typeCast: function (field, next) {
          if (field.type === "DATETIME" || field.type === "DATE") {
            return field.string();
          }
          return next();
        },
      },
  });

sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });


module.exports = sequelize;

