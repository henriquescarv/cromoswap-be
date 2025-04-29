const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('cromoswap-db', 'postgres', 'EuOdeioCocoRalado', {
    host: 'localhost',
    dialect: 'postgres',
    port: 5432,
});

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
        allowNull: true,
        unique: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false
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
    }
});

const Friendship = sequelize.define('Friendship', {
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'declined'),
        allowNull: false,
        defaultValue: 'pending'
    }
});

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

User.belongsToMany(User, { through: Friendship, as: 'Friends', foreignKey: 'userId1', otherKey: 'userId2' });

sequelize.sync({ alter: true })
    .then(() => console.log('Database & tables created!'))
    .catch(err => console.error('Unable to create database & tables:', err));

module.exports = { User, AlbumTemplate, UserAlbum, TemplateSticker, UserSticker, Message, Notification, Friendship, sequelize };
