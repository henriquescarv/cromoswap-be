const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TemplateSticker = sequelize.define('TemplateSticker', {
  order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  }
});

module.exports = TemplateSticker;
