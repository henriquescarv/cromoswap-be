const express = require('express');
const router = express.Router();
const { User } = require('../db.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = 'your_secret_key';

// Registrar novo usuário
router.post('/register', async (req, res) => {
    const { username, email, password, countryState, city } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        const emailExists = await User.findOne({ where: { email } });

        if (!!user) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        if (!!emailExists) {
            res.status(400).json({ message: 'Email already exists' });
            return;
        }
        const hashedPassword = bcrypt.hashSync(password, 8);
        const newUser = await User.create({ username, email, password: hashedPassword, countryState, city });
        const token = jwt.sign({ id: newUser.username }, SECRET_KEY, { expiresIn: '1h' });
        res.status(201).json({ message: 'User registered successfully', token });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: 'Error registering user', error });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    try {
        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        const token = jwt.sign({ id: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    } catch (error) {
        res.status(400).json({ message: 'Error logging in', error });
    }
});

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
            return res.status(401).json({ message: 'INVALID_TOKEN' }); // <-- Aqui
        }
        req.userId = decoded.id;
        next();
    });
};

// Exemplo de rota protegida
router.get('/protected', authenticate, (req, res) => {
    res.status(200).json({ message: 'Access granted to protected route', user: req.userId });
});

module.exports = router;
