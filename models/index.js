const sequelize = require('../config/database');

const User = require('./User');
const AlbumTemplate = require('./AlbumTemplate');
const UserAlbum = require('./UserAlbum');
const TemplateSticker = require('./TemplateSticker');
const UserSticker = require('./UserSticker');
const Message = require('./Message');
const Notification = require('./Notification');
const Follow = require('./Follow');
const PasswordReset = require('./PasswordReset');

User.hasMany(UserAlbum, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserAlbum.belongsTo(User, { foreignKey: 'userId' });

AlbumTemplate.hasMany(UserAlbum, { foreignKey: 'albumTemplateId', onDelete: 'CASCADE' });
UserAlbum.belongsTo(AlbumTemplate, { foreignKey: 'albumTemplateId' });

TemplateSticker.belongsTo(AlbumTemplate, { foreignKey: 'albumTemplateId' });

UserSticker.belongsTo(UserAlbum, { foreignKey: 'userAlbumId' });
UserSticker.belongsTo(TemplateSticker, { foreignKey: 'templateStickerId' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages', onDelete: 'CASCADE' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Follow, { foreignKey: 'followerId', as: 'following' });
User.hasMany(Follow, { foreignKey: 'followingId', as: 'followers' });

module.exports = {
  sequelize,
  User,
  AlbumTemplate,
  UserAlbum,
  TemplateSticker,
  UserSticker,
  Message,
  Notification,
  Follow,
  PasswordReset
};
