const jwt = require('jsonwebtoken');
const { Message } = require('../models');

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

        const senderId = socket.userId;

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

        io.to(`user_${receiverId}`).emit('receive_message', {
          id: message.id,
          senderId,
          receiverId,
          content,
          seen: false,
          createdAt: message.createdAt
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
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
