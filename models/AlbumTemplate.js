const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AlbumTemplate = sequelize.define('AlbumTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  }
}, {
  tableName: 'AlbumTemplates',
  timestamps: true
});

module.exports = AlbumTemplate;
