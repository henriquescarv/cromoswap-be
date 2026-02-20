const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  seen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = Message;
