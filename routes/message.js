const express = require('express');
const router = express.Router();
const { Message, User } = require('../db.js');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your_secret_key';

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

// GET /messages/:otherUserId - histórico de mensagens entre o autenticado e outro usuário
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
        if (/^\d+$/.test(otherUserId)) {
            targetUserId = Number(otherUserId);
        } else {
            const user = await User.findOne({ where: { username: otherUserId }, attributes: ['id'] });
            targetUserId = user?.id;
        }
        if (!targetUserId) {
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
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages', error });
    }
});

router.post('/messages/mark-all-seen', authenticate, async (req, res) => {
  try {
      let myUserId = req.userId;
      if (typeof myUserId !== 'number') {
          const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
          myUserId = me?.id;
      }
      if (!myUserId) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Atualiza todas as mensagens recebidas pelo usuário para seen = true
      await Message.update(
          { seen: true },
          { where: { receiverId: myUserId, seen: false } }
      );

      res.status(200).json({ message: 'All received messages marked as seen' });
  } catch (error) {
      console.error('Error marking messages as seen:', error);
      res.status(500).json({ message: 'Error marking messages as seen', error });
  }
});

router.get('/last-received-messages', authenticate, async (req, res) => {
  try {
      let myUserId = req.userId;
      if (typeof myUserId !== 'number') {
          const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
          myUserId = me?.id;
      }
      if (!myUserId) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Busca todos os senderIds que já enviaram mensagem para o usuário autenticado
      const senders = await Message.findAll({
          where: { receiverId: myUserId },
          attributes: ['senderId'],
          group: ['senderId']
      });
      const senderIds = senders.map(s => s.senderId);

      // Para cada senderId, busca a última mensagem recebida desse usuário
      const lastMessages = await Promise.all(senderIds.map(async senderId => {
          const lastMessage = await Message.findOne({
              where: { receiverId: myUserId, senderId },
              order: [['createdAt', 'DESC']]
          });
          if (!lastMessage) return null;
          // Busca dados do remetente
          const senderUser = await User.findOne({
              where: { id: senderId },
              attributes: ['id', 'username', 'email', 'countryState', 'city']
          });
          return {
              ...lastMessage.toJSON(),
              senderUser
          };
      }));

      // Remove nulos (caso algum sender não tenha mensagem)
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
