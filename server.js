const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('./db.js');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors());

// Importa as rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const albumRoutes = require('./routes/album');

// Rotas de autenticação (register, login, protected)
app.use('/', authRoutes);
// Rotas de usuário
app.use('/', userRoutes);
// Rotas de álbuns
app.use('/', albumRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
