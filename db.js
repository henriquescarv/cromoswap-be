const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT,
  }
);

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  countryState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
});

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

const UserAlbum = sequelize.define('UserAlbum', {});

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

const UserSticker = sequelize.define('UserSticker', {
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
});

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

const Notification = sequelize.define('Notification', {
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  seen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  }
});

// NOVA TABELA FOLLOW (seguidores)
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

const PasswordReset = sequelize.define('PasswordReset', {
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// RELACIONAMENTOS
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

// RELACIONAMENTO DE SEGUIDORES
User.hasMany(Follow, { foreignKey: 'followerId', as: 'following' });
User.hasMany(Follow, { foreignKey: 'followingId', as: 'followers' });

// SYNC
sequelize.sync({ alter: true })
  .then(() => console.log('Database & tables created!'))
  .catch(err => console.error('Unable to create database & tables:', err));

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