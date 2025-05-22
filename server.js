const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Message } = require('./db.js');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors());

// Importa as rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const albumRoutes = require('./routes/album');
const messageRoutes = require('./routes/message');

app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', albumRoutes);
app.use('/', messageRoutes);

// Socket.io logic
io.on('connection', (socket) => {
    // Autenticação simples via query (ideal: JWT)
    const { userId } = socket.handshake.query;
    if (!userId) {
        socket.disconnect();
        return;
    }
    socket.join(`user_${userId}`);

    // Recebe mensagem e salva no banco, depois envia ao destinatário
    socket.on('send_message', async (data) => {
        const { senderId, receiverId, content } = data;
        if (!senderId || !receiverId || !content) return;

        // Salva no banco
        const message = await Message.create({
            senderId,
            receiverId,
            content,
            seen: false
        });

        // Envia para o destinatário (se conectado)
        io.to(`user_${receiverId}`).emit('receive_message', {
            id: message.id,
            senderId,
            receiverId,
            content,
            seen: false,
            createdAt: message.createdAt
        });
    });

    // Marcar mensagem como lida
    socket.on('mark_seen', async (data) => {
        const { messageId } = data;
        if (!messageId) return;
        await Message.update({ seen: true }, { where: { id: messageId } });
    });

    socket.on('disconnect', () => {
        // Cleanup se necessário
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
