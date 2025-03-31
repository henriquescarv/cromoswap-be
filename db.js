const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('cromoswap-db', 'postgres', 'EuOdeioCocoRalado', {
    host: 'localhost',
    dialect: 'postgres',
    port: 5432,
});

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
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
    }
});

const AlbumTemplate = sequelize.define('AlbumTemplate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
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

const UserAlbum = sequelize.define('UserAlbum', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    }
});

const Sticker = sequelize.define('Sticker', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
});

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
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
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
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
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'declined'),
        allowNull: false,
        defaultValue: 'pending'
    }
});

// Definição de relacionamentos
User.hasMany(UserAlbum, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserAlbum.belongsTo(User, { foreignKey: 'userId' });

AlbumTemplate.hasMany(UserAlbum, { foreignKey: 'albumTemplateId', onDelete: 'CASCADE' });
UserAlbum.belongsTo(AlbumTemplate, { foreignKey: 'albumTemplateId' });

UserAlbum.hasMany(Sticker, { foreignKey: 'userAlbumId', onDelete: 'CASCADE' });
Sticker.belongsTo(UserAlbum, { foreignKey: 'userAlbumId' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages', onDelete: 'CASCADE' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.belongsToMany(User, { through: Friendship, as: 'Friends', foreignKey: 'userId1', otherKey: 'userId2' });

// Sincronizar o banco de dados
sequelize.sync({ alter: true })
    .then(() => console.log('Database & tables created!'))
    .catch(err => console.error('Unable to create database & tables:', err));

module.exports = { User, AlbumTemplate, UserAlbum, Sticker, Message, Notification, Friendship, sequelize };
