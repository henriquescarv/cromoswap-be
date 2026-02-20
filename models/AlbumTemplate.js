const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AlbumTemplate = sequelize.define('AlbumTemplate', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  }
});

module.exports = AlbumTemplate;
