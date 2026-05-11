const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OTPRequest = sequelize.define('OTPRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  otp: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  purpose: {
    type: DataTypes.ENUM('register', 'reset_password'),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'OTPRequests',
  timestamps: true,
});

module.exports = OTPRequest;
