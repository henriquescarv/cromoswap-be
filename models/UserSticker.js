const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserSticker = sequelize.define('UserSticker', {
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
});

module.exports = UserSticker;
