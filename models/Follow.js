const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const Follow = sequelize.define('Follow', {
  followerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE'
  },
  followingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['followerId', 'followingId']
    }
  ]
});

module.exports = Follow;
