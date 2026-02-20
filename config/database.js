const { Sequelize } = require('sequelize');
const envConfig = require('./environment');

const config = {
  username: envConfig.database.user,
  password: envConfig.database.password,
  database: envConfig.database.name,
  host: envConfig.database.host,
  port: envConfig.database.port,
  dialect: envConfig.database.dialect,
  logging: envConfig.nodeEnv === 'development' ? console.log : false
};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

sequelize.authenticate()
  .then(() => console.log('âœ… Database connected successfully!'))
  .catch(err => console.error('âŒ Unable to connect to database:', err));

module.exports = sequelize;

module.exports.development = config;
module.exports.production = config;
module.exports.test = config;
