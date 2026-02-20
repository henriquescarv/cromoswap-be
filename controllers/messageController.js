const { Message, User } = require('../models');
const { Op } = require('sequelize');

exports.getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {

      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }

    let targetUserId;
    let otherUser = null;
    if (/^\d+$/.test(otherUserId)) {
      targetUserId = Number(otherUserId);
      otherUser = await User.findOne({ where: { id: targetUserId }, attributes: ['id', 'username', 'email', 'countryState', 'city'] });
    } else {
      otherUser = await User.findOne({ where: { username: otherUserId }, attributes: ['id', 'username', 'email', 'countryState', 'city'] });
      targetUserId = otherUser?.id;
    }
    if (!targetUserId || !otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: myUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: myUserId }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    res.status(200).json({
      messages,
      otherUser
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error });
  }
};

exports.markMessagesAsSeen = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }

    let senderId;
    if (/^\d+$/.test(otherUserId)) {
      senderId = Number(otherUserId);
    } else {
      const user = await User.findOne({ where: { username: otherUserId }, attributes: ['id'] });
      senderId = user?.id;
    }
    if (!senderId) {
      return res.status(404).json({ message: 'Other user not found' });
    }

    await Message.update(
      { seen: true },
      { where: { receiverId: myUserId, senderId, seen: false } }
    );
    res.status(200).json({ message: 'Messages from this user marked as seen' });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    res.status(500).json({ message: 'Error marking messages as seen', error });
  }
};

exports.getLastMessages = async (req, res) => {
  try {
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }
    if (!myUserId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const sent = await Message.findAll({
      where: { senderId: myUserId },
      attributes: ['receiverId'],
      group: ['receiverId']
    });
    const received = await Message.findAll({
      where: { receiverId: myUserId },
      attributes: ['senderId'],
      group: ['senderId']
    });

    const userIdsSet = new Set([
      ...sent.map(s => s.receiverId),
      ...received.map(r => r.senderId)
    ]);
    userIdsSet.delete(myUserId);
    const userIds = Array.from(userIdsSet);

    const lastMessages = await Promise.all(userIds.map(async otherUserId => {
      const lastMessage = await Message.findOne({
        where: {
          [Op.or]: [
            { senderId: myUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: myUserId }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
      if (!lastMessage) return null;

      const otherUser = await User.findOne({
        where: { id: otherUserId },
        attributes: ['id', 'username', 'email', 'countryState', 'city']
      });

      const unreadMessages = await Message.count({
        where: { receiverId: myUserId, senderId: otherUserId, seen: false }
      });
      return {
        ...lastMessage.toJSON(),
        otherUser,
        unreadMessages
      };
    }));

    const filtered = lastMessages.filter(m => m);

    res.status(200).json(filtered);
  } catch (error) {
    console.error('Error fetching last received messages:', error);
    res.status(500).json({ message: 'Error fetching last received messages', error });
  }
};

exports.getUnreadMessagesCount = async (req, res) => {
  try {
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }
    if (!myUserId) {
      return res.status(404).json({ message: 'User not found' });
    }
    const unreadCount = await Message.count({
      where: {
        receiverId: myUserId,
        seen: false
      }
    });
    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread messages count:', error);
    res.status(500).json({ message: 'Error fetching unread messages count', error });
  }
};
