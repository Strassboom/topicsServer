require('dotenv').config();
const pgDatabase = process.env.PROD ? 'postgres' : 'test';
const { Sequelize } = require('sequelize');
const sequelizeInstance = new Sequelize(pgDatabase, process.env.PG_USERNAME, process.env.PG_PASS, {
  host: process.env.PG_HOST,
  dialect: 'postgres',
  pool: {
    max: 5,
    idle: 30000,
    acquire: 60000
  },
  logging: false
});
sequelizeInstance.sync();
module.exports = sequelizeInstance;