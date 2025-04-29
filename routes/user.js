const express = require('express');
const router = express.Router();
const { User } = require('../db.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

// Rota autenticada para pegar dados do usuário (nome, email, estado e cidade)
router.get('/summary', authenticate, async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.userId },
            attributes: ['id', 'username', 'email', 'countryState', 'city'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            ...user.toJSON(),
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Error fetching user data', error });
    }
});

// Rota autenticada para atualizar o estado e a cidade do usuário
router.post('/region', authenticate, async (req, res) => {
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
        res.status(500).json({ message: 'Error updating region', error });
    }
});

// Rota autenticada para pegar usuários por região (estado e cidade)
router.get('/users/by-region', authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ where: { username: req.userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const users = await User.findAll({
            where: {
                countryState: user.countryState,
                city: user.city,
                username: { [require('sequelize').Op.ne]: req.userId }
            },
            attributes: ['id', 'username', 'email', 'countryState', 'city'],
        });

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users by region:', error);
        res.status(500).json({ message: 'Error fetching users by region', error });
    }
});

module.exports = router;
