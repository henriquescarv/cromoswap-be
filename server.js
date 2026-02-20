const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { errorHandler } = require('./middlewares/errorHandler');
const { initializeSocketService } = require('./services/socketService');
const config = require('./config/environment');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: config.cors.origin,
  }
});

app.use(bodyParser.json());
app.use(cors());

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const albumRoutes = require('./routes/album');
const messageRoutes = require('./routes/message');

app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', albumRoutes);
app.use('/', messageRoutes);

app.use(errorHandler);

initializeSocketService(io, config.jwt.secret);

server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
