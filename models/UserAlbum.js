const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAlbum = sequelize.define('UserAlbum', {});

module.exports = UserAlbum;
