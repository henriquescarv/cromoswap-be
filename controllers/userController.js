const { User, UserAlbum, AlbumTemplate, TemplateSticker, UserSticker, Notification, Follow } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

exports.getSummary = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.userId },
      attributes: ['id', 'username', 'email', 'countryState', 'city'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const followers = await Follow.count({ where: { followingId: user.id } });
    const following = await Follow.count({ where: { followerId: user.id } });

    res.status(200).json({
      ...user.toJSON(),
      followers,
      following
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Error fetching user data', error: error.message });
  }
};

exports.updateRegion = async (req, res) => {
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
    res.status(500).json({ message: 'Error updating region', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { username, email, password, countryState, city } = req.body;

  try {
    const user = await User.findOne({ where: { username: req.userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = {};

    if (username) {
      return res.status(400).json({
        message: 'Username cannot be changed at this time. This feature will be available in the future.'
      });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email;
    }

    if (password) {
      updateData.password = bcrypt.hashSync(password, 8);
    }

    if (countryState !== undefined) {
      updateData.countryState = countryState;
    }

    if (city !== undefined) {
      updateData.city = city;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No data provided for update' });
    }

    await User.update(updateData, { where: { username: req.userId } });

    const updatedUser = await User.findOne({
      where: { username: req.userId },
      attributes: ['id', 'username', 'email', 'countryState', 'city']
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

exports.getUsersByRegion = async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const users = await User.findAll({
      where: {
        countryState: user.countryState,
        city: user.city,
        username: { [Op.ne]: req.userId }
      },
      attributes: ['id', 'username', 'countryState', 'city'],
    });

    const myUserAlbums = await UserAlbum.findAll({
      where: { userId: user.id },
      attributes: ['albumTemplateId', 'id'],
    });
    const myAlbumTemplateIds = myUserAlbums.map(a => a.albumTemplateId);

    const myUserStickers = await UserSticker.findAll({
      where: { userAlbumId: myUserAlbums.map(a => a.id) },
      attributes: ['templateStickerId', 'quantity'],
    });

    const result = await Promise.all(users.map(async otherUser => {
      const otherUserAlbums = await UserAlbum.findAll({
        where: { userId: otherUser.id },
        attributes: ['albumTemplateId', 'id'],
      });
      const otherAlbumTemplateIds = otherUserAlbums.map(a => a.albumTemplateId);

      const albumsInCommonIds = myAlbumTemplateIds.filter(id => otherAlbumTemplateIds.includes(id));

      let albumsInCommon = [];
      if (albumsInCommonIds.length > 0) {
        const albumTemplates = await AlbumTemplate.findAll({
          where: { id: albumsInCommonIds },
          attributes: ['name'],
        });
        albumsInCommon = albumTemplates.map(a => a.name);
      }

      const otherUserAlbumIdsInCommon = otherUserAlbums
        .filter(a => albumsInCommonIds.includes(a.albumTemplateId))
        .map(a => a.id);

      const otherUserStickers = await UserSticker.findAll({
        where: { userAlbumId: otherUserAlbumIdsInCommon },
        attributes: ['templateStickerId', 'quantity'],
      });

      const myUserStickersInCommon = myUserStickers.filter(s =>
        otherUserStickers.some(o => o.templateStickerId === s.templateStickerId)
      );

      const youHave = myUserStickersInCommon
        .filter(s => s.quantity > 1 &&
          otherUserStickers.some(o => o.templateStickerId === s.templateStickerId && o.quantity === 0)
        ).length;

      const youNeed = myUserStickersInCommon
        .filter(s => s.quantity === 0 &&
          otherUserStickers.some(o => o.templateStickerId === s.templateStickerId && o.quantity > 1)
        ).length;

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

    const filteredResult = result.filter(u => u !== null);
    res.status(200).json(filteredResult);
  } catch (error) {
    console.error('Error fetching users by region:', error);
    res.status(500).json({ message: 'Error fetching users by region', error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = await User.findOne({ where: { username: req.userId }, attributes: ['id', 'username'] });
    const user = await User.findOne({ where: { id: userId }, attributes: ['id', 'username'] });

    if (!user || !requester) {
      return res.status(404).json({ message: 'User not found' });
    }

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

    const userAlbumIds = userAlbums.map(a => a.id);
    const requesterAlbumIds = requesterAlbums.map(a => a.id);

    const userTemplateIds = userAlbums.map(a => a.albumTemplateId);
    const requesterTemplateIds = requesterAlbums.map(a => a.albumTemplateId);
    const commonTemplateIds = userTemplateIds.filter(id => requesterTemplateIds.includes(id));

    let youHaveList = [];
    let youNeedList = [];

    for (const templateId of commonTemplateIds) {
      const userAlbum = userAlbums.find(a => a.albumTemplateId === templateId);
      const requesterAlbum = requesterAlbums.find(a => a.albumTemplateId === templateId);

      const [userStickers, requesterStickers] = await Promise.all([
        UserSticker.findAll({
          where: { userAlbumId: userAlbum.id },
          attributes: ['id', 'quantity', 'templateStickerId'],
          include: [{
            model: TemplateSticker,
            attributes: ['id', 'category', 'number', 'order']
          }]
        }),
        UserSticker.findAll({
          where: { userAlbumId: requesterAlbum.id },
          attributes: ['id', 'quantity', 'templateStickerId']
        })
      ]);

      const requesterStickersMap = {};
      for (const s of requesterStickers) {
        requesterStickersMap[s.templateStickerId] = s;
      }

      const youNeedStickers = [];
      const youHaveStickers = [];

      for (const userSticker of userStickers) {
        const requesterSticker = requesterStickersMap[userSticker.templateStickerId];

        if (userSticker.quantity > 1 && (!requesterSticker || requesterSticker.quantity === 0)) {
          youNeedStickers.push({
            id: userSticker.id,
            number: userSticker.TemplateSticker?.number,
            category: userSticker.TemplateSticker?.category,
            order: userSticker.TemplateSticker?.order
          });
        }

        if ((!userSticker || userSticker.quantity === 0) && requesterSticker && requesterSticker.quantity > 1) {
          youHaveStickers.push({
            id: userSticker.id,
            number: userSticker.TemplateSticker?.number,
            category: userSticker.TemplateSticker?.category,
            order: userSticker.TemplateSticker?.order
          });
        }
      }

      if (youNeedStickers.length > 0) {
        youNeedList.push({
          userAlbumId: userAlbum.id,
          name: userAlbum.AlbumTemplate?.name,
          image: userAlbum.AlbumTemplate?.image,
          stickersList: youNeedStickers.sort((a, b) => (a.order || 0) - (b.order || 0))
        });
      }

      if (youHaveStickers.length > 0) {
        youHaveList.push({
          userAlbumId: userAlbum.id,
          name: userAlbum.AlbumTemplate?.name,
          image: userAlbum.AlbumTemplate?.image,
          stickersList: youHaveStickers.sort((a, b) => (a.order || 0) - (b.order || 0))
        });
      }
    }

    const youNeedQuantity = youNeedList.reduce((sum, album) => sum + album.stickersList.length, 0);
    const youHaveQuantity = youHaveList.reduce((sum, album) => sum + album.stickersList.length, 0);

    res.status(200).json({
      id: user.id,
      username: user.username,
      albumsListLength: userAlbums.length,
      albums,
      youHave: { quantity: youHaveQuantity, list: youHaveList },
      youNeed: { quantity: youNeedQuantity, list: youNeedList },
      followers,
      following,
      isFollowing,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
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

    const [follow, created] = await Follow.findOrCreate({
      where: {
        followerId: myUserId,
        followingId: userId
      }
    });

    if (!created) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    const existingNotification = await Notification.findOne({
      where: {
        type: 'follow',
        message: `${follower.username}`,
        userId: userId,
        senderId: myUserId
      }
    });

    if (!existingNotification) {
      await Notification.create({
        type: 'follow',
        message: `${follower.username} follows you`,
        seen: false,
        userId: userId,
        senderId: myUserId
      });
    }

    res.status(201).json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Error following user', error: error.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
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

    const deleted = await Follow.destroy({
      where: {
        followerId: myUserId,
        followingId: userId
      }
    });

    if (!deleted) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

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
    res.status(500).json({ message: 'Error unfollowing user', error: error.message });
  }
};

exports.getFollows = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.body;

    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }

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
      const follows = await Follow.findAll({
        where: { followingId: targetUserId },
        attributes: ['followerId']
      });
      const followerIds = follows.map(f => f.followerId);

      users = await User.findAll({
        where: { id: followerIds },
        attributes: ['id', 'username', 'city', 'countryState']
      });

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
      const follows = await Follow.findAll({
        where: { followerId: targetUserId },
        attributes: ['followingId']
      });
      const followingIds = follows.map(f => f.followingId);

      users = await User.findAll({
        where: { id: followingIds },
        attributes: ['id', 'username', 'city', 'countryState']
      });

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
    res.status(500).json({ message: 'Error fetching follows', error: error.message });
  }
};

exports.updateNotificationSeen = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { seenNewValue } = req.body;

    let userId = req.userId;
    if (typeof userId !== 'number') {
      const user = await User.findOne({ where: { username: userId }, attributes: ['id'] });
      userId = user?.id;
    }

    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId: userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.update({ seen: seenNewValue });

    res.status(200).json({ message: 'Notification updated', seen: seenNewValue });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    let userId = req.userId;
    if (typeof userId !== 'number') {
      const user = await User.findOne({ where: { username: userId }, attributes: ['id'] });
      userId = user?.id;
    }

    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

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
        return {
          ...n.toJSON(),
          senderUser
        };
      })
    );

    res.status(200).json(notificationsWithSender);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

exports.deleteNotifications = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'notificationIds must be a non-empty array' });
    }

    const deleted = await Notification.destroy({
      where: {
        id: notificationIds,
        userId: req.userId
      }
    });

    res.status(200).json({ message: 'Notifications deleted', deletedCount: deleted });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ message: 'Error deleting notifications', error: error.message });
  }
};

exports.getUnreadNotificationsCount = async (req, res) => {
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
    res.status(500).json({ message: 'Error fetching unread notifications count', error: error.message });
  }
};
