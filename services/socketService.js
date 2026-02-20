const jwt = require('jsonwebtoken');
const { Message, User } = require('../models');

const initializeSocketService = (io, jwtSecret) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.userId = decoded.id;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    console.log(`âœ… User ${userId} connected via Socket.io`);
    socket.join(`user_${userId}`);

    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content } = data;
        const username = socket.userId;

        const sender = await User.findOne({ where: { username }, attributes: ['id'] });
        if (!sender) {
          console.log('❌ Sender not found:', username);
          socket.emit('error', { message: 'Sender not found' });
          return;
        }

        const senderId = sender.id;

        if (!receiverId || !content) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        const message = await Message.create({
          senderId,
          receiverId,
          content,
          seen: false
        });

        const messageData = {
          id: message.id,
          senderId,
          receiverId,
          content,
          seen: false,
          createdAt: message.createdAt
        };

        io.to(`user_${receiverId}`).emit('receive_message', messageData);
        socket.emit('receive_message', messageData);
      } catch (error) {
        socket.emit('error', { message: 'Error sending message', details: error.message });
      }
    });

    socket.on('mark_seen', async (data) => {
      try {
        const { messageId } = data;
        if (!messageId) return;

        await Message.update({ seen: true }, { where: { id: messageId } });
      } catch (error) {
        console.error('Error marking message as seen:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`âŒ User ${socket.userId} disconnected`);
    });
  });
};

module.exports = { initializeSocketService };
