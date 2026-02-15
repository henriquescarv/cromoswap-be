const express = require('express');
const router = express.Router();
const { Message, User } = require('../db.js');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

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

// GET /messages/:otherUserId - histórico de mensagens entre o autenticado e outro usuário, incluindo dados do outro usuário
router.get('/messages/:otherUserId', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      // Se necessário, converte username para id
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }
    // Permite buscar por id numérico ou username
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
});

// Endpoint para marcar como seen = true apenas as mensagens recebidas de um usuário específico
router.post('/messages/mark-seen/:otherUserId', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }
    // Permite buscar por id numérico ou username
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
    // Marca como seen = true apenas as mensagens recebidas desse usuário
    await Message.update(
      { seen: true },
      { where: { receiverId: myUserId, senderId, seen: false } }
    );
    res.status(200).json({ message: 'Messages from this user marked as seen' });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    res.status(500).json({ message: 'Error marking messages as seen', error });
  }
});

router.get('/last-messages', authenticate, async (req, res) => {
  try {
    let myUserId = req.userId;
    if (typeof myUserId !== 'number') {
      const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
      myUserId = me?.id;
    }
    if (!myUserId) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Busca todos os userIds distintos que já trocaram mensagem com o usuário autenticado
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

    // Junta todos os userIds distintos (exceto o próprio)
    const userIdsSet = new Set([
      ...sent.map(s => s.receiverId),
      ...received.map(r => r.senderId)
    ]);
    userIdsSet.delete(myUserId);
    const userIds = Array.from(userIdsSet);

    // Para cada userId, busca a última mensagem trocada (enviada ou recebida) e dados do usuário
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
      // Busca dados do outro usuário
      const otherUser = await User.findOne({
        where: { id: otherUserId },
        attributes: ['id', 'username', 'email', 'countryState', 'city']
      });
      // Conta mensagens não lidas desse usuário para o autenticado
      const unreadMessages = await Message.count({
        where: { receiverId: myUserId, senderId: otherUserId, seen: false }
      });
      return {
        ...lastMessage.toJSON(),
        otherUser,
        unreadMessages
      };
    }));

    // Remove nulos (caso algum user não tenha mensagem)
    const filtered = lastMessages.filter(m => m);

    res.status(200).json(filtered);
  } catch (error) {
    console.error('Error fetching last received messages:', error);
    res.status(500).json({ message: 'Error fetching last received messages', error });
  }
});

// Endpoint para retornar a quantidade de mensagens não lidas do usuário autenticado
router.get('/unread-messages-count', authenticate, async (req, res) => {
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
});

module.exports = router;
