const express = require('express');
const router = express.Router();
const { User, UserAlbum, AlbumTemplate, UserSticker, Notification, Follow } = require('../db.js');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

require('dotenv').config();
const SECRET_KEY = process.env.JWT_SECRET;

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(403).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'INVALID_TOKEN' });
    }
    req.userId = decoded.id;
    next();
  });
};

// Rota autenticada para pegar dados do usuário (nome, email, estado, cidade, seguidores e seguindos)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.userId },
      attributes: ['id', 'username', 'email', 'countryState', 'city'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Conta seguidores e seguindo
    const followers = await Follow.count({ where: { followingId: user.id } });
    const following = await Follow.count({ where: { followerId: user.id } });

    res.status(200).json({
      ...user.toJSON(),
      followers,
      following
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Error fetching user data', error });
  }
});

// Rota autenticada para atualizar o estado e a cidade do usuário
router.post('/region', authenticate, async (req, res) => {
  const { countryState, city } = req.body;
  try {
    const user = await User.findOne({ where: { username: req.userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.update({ countryState, city }, { where: { username: req.userId } });
    res.status(200).json({ message: 'Region updated successfully' });
  } catch (error) {
    console.error('Error updating region:', error);
    res.status(500).json({ message: 'Error updating region', error });
  }
});

// Rota autenticada para atualizar dados do usuário
router.put('/update-profile', authenticate, async (req, res) => {
  const { username, email, password, countryState, city } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    const user = await User.findOne({ where: { username: req.userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Objeto para armazenar os campos a serem atualizados
    const updateData = {};

    // Bloqueia alteração de username (feature futura)
    if (username) {
      return res.status(400).json({
        message: 'Username cannot be changed at this time. This feature will be available in the future.'
      });
    }

    // Verifica se o email foi fornecido e se já não está em uso
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email;
    }

    // Hash da nova senha se fornecida
    if (password) {
      updateData.password = bcrypt.hashSync(password, 8);
    }

    // Atualiza countryState se fornecido
    if (countryState !== undefined) {
      updateData.countryState = countryState;
    }

    // Atualiza city se fornecida
    if (city !== undefined) {
      updateData.city = city;
    }

    // Se não há nada para atualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No data provided for update' });
    }

    // Atualiza o usuário
    await User.update(updateData, { where: { username: req.userId } });

    // Busca o usuário atualizado
    const updatedUser = await User.findOne({
      where: { username: req.userId },
      attributes: ['id', 'username', 'email', 'countryState', 'city']
    });

    const response = {
      message: 'Profile updated successfully',
      user: updatedUser
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Rota autenticada para pegar usuários por região (estado e cidade)
router.get('/users/by-region', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Busca todos os usuários da mesma região, exceto o próprio usuário
    const users = await User.findAll({
      where: {
        countryState: user.countryState,
        city: user.city,
        username: { [require('sequelize').Op.ne]: req.userId }
      },
      attributes: ['id', 'username', 'countryState', 'city'],
    });

    // Busca os UserAlbums do usuário autenticado
    const myUserAlbums = await UserAlbum.findAll({
      where: { userId: user.id },
      attributes: ['albumTemplateId', 'id'],
    });
    const myAlbumTemplateIds = myUserAlbums.map(a => a.albumTemplateId);

    // Busca todos os UserSticker do usuário autenticado
    const myUserStickers = await UserSticker.findAll({
      where: { userAlbumId: myUserAlbums.map(a => a.id) },
      attributes: ['templateStickerId', 'quantity'],
    });

    // Para cada usuário, busca os UserAlbums e encontra os álbuns em comum
    const result = await Promise.all(users.map(async otherUser => {
      const otherUserAlbums = await UserAlbum.findAll({
        where: { userId: otherUser.id },
        attributes: ['albumTemplateId', 'id'],
      });
      const otherAlbumTemplateIds = otherUserAlbums.map(a => a.albumTemplateId);

      // Álbuns em comum (ids)
      const albumsInCommonIds = myAlbumTemplateIds.filter(id => otherAlbumTemplateIds.includes(id));

      // Busca os nomes dos álbuns em comum
      let albumsInCommon = [];
      if (albumsInCommonIds.length > 0) {
        const albumTemplates = await AlbumTemplate.findAll({
          where: { id: albumsInCommonIds },
          attributes: ['name'],
        });
        albumsInCommon = albumTemplates.map(a => a.name);
      }

      // Busca todos os UserSticker do outro usuário, apenas dos álbuns em comum
      const otherUserAlbumIdsInCommon = otherUserAlbums
        .filter(a => albumsInCommonIds.includes(a.albumTemplateId))
        .map(a => a.id);

      const otherUserStickers = await UserSticker.findAll({
        where: { userAlbumId: otherUserAlbumIdsInCommon },
        attributes: ['templateStickerId', 'quantity'],
      });

      // Filtra os stickers dos álbuns em comum do usuário autenticado
      const myUserStickersInCommon = myUserStickers.filter(s =>
        otherUserStickers.some(o => o.templateStickerId === s.templateStickerId)
      );

      // youHave: você tem (quantity > 0) e o outro não tem (quantity = 0)
      const youHave = myUserStickersInCommon
        .filter(s => s.quantity > 1 &&
          otherUserStickers.some(o => o.templateStickerId === s.templateStickerId && o.quantity === 0)
        ).length;

      // youNeed: você não tem (quantity = 0) e o outro tem (quantity > 0)
      const youNeed = myUserStickersInCommon
        .filter(s => s.quantity === 0 &&
          otherUserStickers.some(o => o.templateStickerId === s.templateStickerId && o.quantity > 1)
        ).length;

      // Só retorna se ambos forem maiores que zero
      if (youHave > 0 && youNeed > 0) {
        return {
          ...otherUser.toJSON(),
          albumsInCommon,
          youHave,
          youNeed
        };
      }
      return null;
    }));

    // Filtra nulos (usuários que não atendem ao critério)
    const filteredResult = result.filter(u => u !== null);

    res.status(200).json(filteredResult);
  } catch (error) {
    console.error('Error fetching users by region:', error);
    res.status(500).json({ message: 'Error fetching users by region', error });
  }
});

router.get('/user-profile/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = await User.findOne({ where: { username: req.userId }, attributes: ['id', 'username'] });
    const user = await User.findOne({ where: { id: userId }, attributes: ['id', 'username'] });

    if (!user || !requester) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Busca os álbuns do usuário consultado e do usuário autenticado
    const [userAlbums, requesterAlbums] = await Promise.all([
      UserAlbum.findAll({
        where: { userId: user.id },
        attributes: ['id', 'albumTemplateId'],
        include: [{ model: AlbumTemplate, attributes: ['name', 'image'] }],
      }),
      UserAlbum.findAll({
        where: { userId: requester.id },
        attributes: ['id', 'albumTemplateId'],
        include: [{ model: AlbumTemplate, attributes: ['name', 'image'] }],
      }),
    ]);

    // Busca todos os stickers dos dois usuários, incluindo o número e category do sticker
    const [userStickers, requesterStickers] = await Promise.all([
      UserSticker.findAll({
        where: { userAlbumId: userAlbums.map(a => a.id) },
        attributes: ['id', 'userAlbumId', 'templateStickerId', 'quantity'],
        include: [{ model: require('../db.js').TemplateSticker, attributes: ['number', 'category'] }]
      }),
      UserSticker.findAll({
        where: { userAlbumId: requesterAlbums.map(a => a.id) },
        attributes: ['id', 'userAlbumId', 'templateStickerId', 'quantity'],
        include: [{ model: require('../db.js').TemplateSticker, attributes: ['number', 'category'] }]
      }),
    ]);

    // Função para mapear UserSticker por albumId e templateStickerId
    function mapStickersByAlbum(stickers) {
      const map = {};
      for (const s of stickers) {
        if (!map[s.userAlbumId]) map[s.userAlbumId] = {};
        map[s.userAlbumId][s.templateStickerId] = s;
      }
      return map;
    }
    const userStickersMap = mapStickersByAlbum(userStickers);
    const requesterStickersMap = mapStickersByAlbum(requesterStickers);

    // Função para montar lista de álbuns com stickers filtrados
    function buildAlbumList(sourceAlbums, sourceStickersMap, targetStickersMap, filterFn, albumIdKey = 'albumId', albumIdSource = 'id') {
      return sourceAlbums.map(album => {
        const stickersListFull = [];
        const sourceStickers = sourceStickersMap[album[albumIdSource]] || {};
        const targetStickers = targetStickersMap[album[albumIdSource]] || {};
        for (const templateStickerId in sourceStickers) {
          const s = sourceStickers[templateStickerId];
          const t = targetStickers[templateStickerId];
          if (filterFn(s, t)) {
            const { TemplateSticker, userAlbumId, ...stickerData } = s.toJSON();
            stickersListFull.push({
              ...stickerData,
              albumId: s.userAlbumId, // sempre retorna albumId aqui
              number: TemplateSticker?.number,
              category: TemplateSticker?.category
            });
          }
        }
        return {
          userAlbumId: album[albumIdSource], // <-- sempre userAlbumId no objeto do array list
          name: album.AlbumTemplate?.name,
          quantity: stickersListFull.length,
          stickersList: stickersListFull.slice(0, 5),
        };
      }).filter(a => a.stickersList.length > 0);
    }

    // youHave: requester tem repetidos (>1) e user não tem (0)
    const youHaveFullList = requesterAlbums.map(requesterAlbum => {
      // Procurar o álbum correspondente do user com o mesmo albumTemplateId
      const userAlbum = userAlbums.find(a => a.albumTemplateId === requesterAlbum.albumTemplateId);
      if (!userAlbum) return null;
      const stickersListFull = [];
      const sourceStickers = requesterStickersMap[requesterAlbum.id] || {};
      const targetStickers = userStickersMap[userAlbum.id] || {};
      for (const templateStickerId in sourceStickers) {
        const s = sourceStickers[templateStickerId];
        const t = targetStickers[templateStickerId];
        if (s.quantity > 1 && (!t || t.quantity === 0)) {
          const { TemplateSticker, userAlbumId, ...stickerData } = s.toJSON();
          stickersListFull.push({
            ...stickerData,
            albumId: s.userAlbumId, // sempre retorna albumId aqui
            number: TemplateSticker?.number,
            category: TemplateSticker?.category
          });
        }
      }
      if (stickersListFull.length === 0) return null;
      return {
        userAlbumId: userAlbum.id, // id do álbum do outro usuário
        name: userAlbum.AlbumTemplate?.name,
        quantity: stickersListFull.length,
        stickersList: stickersListFull.slice(0, 5),
      };
    }).filter(a => a);

    const youNeedFullList = requesterAlbums.map(requesterAlbum => {
      // Procurar o álbum correspondente do user com o mesmo albumTemplateId
      const userAlbum = userAlbums.find(a => a.albumTemplateId === requesterAlbum.albumTemplateId);
      if (!userAlbum) return null;
      const stickersListFull = [];
      const sourceStickers = requesterStickersMap[requesterAlbum.id] || {};
      const targetStickers = userStickersMap[userAlbum.id] || {};
      for (const templateStickerId in sourceStickers) {
        const s = sourceStickers[templateStickerId];
        const t = targetStickers[templateStickerId];
        if (s.quantity === 0 && (!t || t.quantity > 1)) {
          const { TemplateSticker, userAlbumId, ...stickerData } = s.toJSON();
          stickersListFull.push({
            ...stickerData,
            albumId: s.userAlbumId, // sempre retorna albumId aqui
            number: TemplateSticker?.number,
            category: TemplateSticker?.category
          });
        }
      }
      if (stickersListFull.length === 0) return null;
      return {
        userAlbumId: userAlbum.id, // id do álbum do outro usuário
        name: userAlbum.AlbumTemplate?.name,
        quantity: stickersListFull.length,
        stickersList: stickersListFull.slice(0, 5),
      };
    }).filter(a => a);

    const youHaveList = youHaveFullList.slice(0, 5);
    const youHaveQuantity = youHaveList.reduce((sum, album) => sum + album.quantity, 0);
    const youHave = {
      quantity: youHaveQuantity,
      list: youHaveList,
    };

    const youNeedList = youNeedFullList.slice(0, 5);
    const youNeedQuantity = youNeedList.reduce((sum, album) => sum + album.quantity, 0);
    const youNeed = {
      quantity: youNeedQuantity,
      list: youNeedList,
    };

    // Monta o array de álbuns com percentCompleted
    const albums = await Promise.all(userAlbums.map(async (album) => {
      const totalStickers = await UserSticker.count({ where: { userAlbumId: album.id } });
      const completedStickers = await UserSticker.count({ where: { userAlbumId: album.id, quantity: { [Op.gt]: 0 } } });

      const percentCompleted = totalStickers > 0
        ? Math.round((completedStickers / totalStickers) * 100)
        : 0;

      return {
        id: album.id,
        name: album.AlbumTemplate?.name,
        image: album.AlbumTemplate?.image,
        percentCompleted,
      };
    }));

    const isFollowing = await Follow.findOne({
      where: { followerId: requester.id, followingId: user.id }
    }) !== null;

    const followers = await Follow.count({ where: { followingId: user.id } });
    const following = await Follow.count({ where: { followerId: user.id } });

    res.status(200).json({
      id: user.id,
      username: user.username,
      albumsListLength: userAlbums.length,
      albums,
      youHave,
      youNeed,
      followers,
      following,
      isFollowing,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile', error });
  }
});

router.post('/follow-user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Garante que o followerId seja sempre numérico
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id', 'username'] });
      myUserId = me?.id;
    }

    const follower = await User.findOne({ where: { id: myUserId } });
    const following = await User.findOne({ where: { id: userId } });

    if (!follower || !following) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verifica se já existe o follow
    const [follow, created] = await Follow.findOrCreate({
      where: {
        followerId: myUserId,
        followingId: userId
      }
    });

    if (!created) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Cria notificação para o usuário seguido
    const existingNotification = await Notification.findOne({
      where: {
        type: 'follow',
        message: `${follower.username}`,
        userId: userId,
        senderId: myUserId // o usuário que está seguindo
      }
    });
    if (!existingNotification) {
      await Notification.create({
        type: 'follow',
        message: `${follower.username} follows you`,
        seen: false,
        userId: userId, // o usuário que está sendo seguido recebe a notificação
        senderId: myUserId // o usuário que está seguindo
      });
    }

    res.status(201).json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Error following user', error });
  }
});

router.post('/unfollow-user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Garante que o followerId seja sempre numérico
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }

    const follower = await User.findOne({ where: { id: myUserId } });
    const following = await User.findOne({ where: { id: userId } });

    if (!follower || !following) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove o follow se existir
    const deleted = await Follow.destroy({
      where: {
        followerId: myUserId,
        followingId: userId
      }
    });

    if (!deleted) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

    // Apaga notificações do tipo 'follow' para aquele userId e message igual ao username do follower
    await Notification.destroy({
      where: {
        type: 'follow',
        userId: userId,
        senderId: myUserId,
      }
    });

    res.status(200).json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Error unfollowing user', error });
  }
});

router.post('/follows/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.body;

    // Garante que o userId do autenticado seja numérico
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }

    // Se userId for só dígitos, trata como ID, senão busca pelo username
    let targetUserId;
    if (/^\d+$/.test(userId)) {
      targetUserId = Number(userId);
    } else {
      const user = await User.findOne({ where: { username: userId }, attributes: ['id'] });
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!["followers", "following"].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Must be 'followers' or 'following'." });
    }

    let users;
    if (type === 'followers') {
      // Usuários que seguem o usuário alvo
      const follows = await Follow.findAll({
        where: { followingId: targetUserId },
        attributes: ['followerId']
      });
      const followerIds = follows.map(f => f.followerId);

      users = await User.findAll({
        where: { id: followerIds },
        attributes: ['id', 'username', 'city', 'countryState']
      });

      // Para cada usuário, verifica se o usuário autenticado segue ele também
      const myFollowings = await Follow.findAll({
        where: {
          followerId: myUserId,
          followingId: followerIds
        },
        attributes: ['followingId']
      });
      const followingIdsSet = new Set(myFollowings.map(f => f.followingId));

      const result = users.map(u => ({
        ...u.toJSON(),
        following: followingIdsSet.has(u.id)
      }));

      return res.status(200).json(result);
    } else {
      // Usuários que o usuário alvo segue
      const follows = await Follow.findAll({
        where: { followerId: targetUserId },
        attributes: ['followingId']
      });
      const followingIds = follows.map(f => f.followingId);

      users = await User.findAll({
        where: { id: followingIds },
        attributes: ['id', 'username', 'city', 'countryState']
      });

      // Para cada usuário, verifica se o usuário autenticado segue ele também
      const myFollowings = await Follow.findAll({
        where: {
          followerId: myUserId,
          followingId: followingIds
        },
        attributes: ['followingId']
      });
      const followingIdsSet = new Set(myFollowings.map(f => f.followingId));

      const result = users.map(u => ({
        ...u.toJSON(),
        following: followingIdsSet.has(u.id)
      }));

      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('Error fetching follows:', error);
    res.status(500).json({ message: 'Error fetching follows', error });
  }
});

router.post('/notification-seen/:notificationId', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { seenNewValue } = req.body;

    // Garante que userId seja numérico
    let userId = req.userId;
    if (typeof userId !== 'number') {
      const user = await User.findOne({ where: { username: userId }, attributes: ['id'] });
      userId = user?.id;
    }
    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Busca a notificação e garante que pertence ao usuário autenticado
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId: userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Atualiza o campo seen para o valor recebido
    await notification.update({ seen: seenNewValue });

    res.status(200).json({ message: 'Notification updated', seen: seenNewValue });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification', error });
  }
});

router.get('/notifications', authenticate, async (req, res) => {
  try {
    let userId = req.userId;
    if (typeof userId !== 'number') {
      const user = await User.findOne({ where: { username: userId }, attributes: ['id'] });
      userId = user?.id;
    }
    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Busca todas as notificações do usuário autenticado, ordenadas da mais recente para a mais antiga
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    // Para cada notificação, busca o senderUser (id e username)
    const notificationsWithSender = await Promise.all(
      notifications.map(async (n) => {
        let senderUser = null;
        if (n.senderId) {
          const sender = await User.findOne({
            where: { id: n.senderId },
            attributes: ['id', 'username']
          });
          if (sender) {
            senderUser = { id: sender.id, username: sender.username };
          }
        }
        // Retorna todos os dados da notificação + senderUser
        return {
          ...n.toJSON(),
          senderUser
        };
      })
    );

    res.status(200).json(notificationsWithSender);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
});

// isso aqui pode ser integrado depois
router.post('/notifications/delete', authenticate, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'notificationIds must be a non-empty array' });
    }

    // Garante que só apaga notificações do usuário autenticado
    const deleted = await Notification.destroy({
      where: {
        id: notificationIds,
        userId: req.userId
      }
    });

    res.status(200).json({ message: 'Notifications deleted', deletedCount: deleted });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ message: 'Error deleting notifications', error });
  }
});

router.get('/notifications-unread-count', authenticate, async (req, res) => {
  try {
    let userId = req.userId;
    if (typeof userId !== 'number') {
      const user = await User.findOne({ where: { username: userId }, attributes: ['id'] });
      userId = user?.id;
    }
    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const unreadCount = await Notification.count({
      where: {
        userId,
        seen: false
      }
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread notifications count:', error);
    res.status(500).json({ message: 'Error fetching unread notifications count', error });
  }
});

module.exports = router;
