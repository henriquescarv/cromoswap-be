const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, UserAlbum, AlbumTemplate } = require('./db.js');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json());
app.use(cors());

app.post('/register', async (req, res) => {
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

// Rota de login
app.post('/login', async (req, res) => {
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

// Rota autenticada para pegar dados do usuário (nome, email, estado e cidade)
app.get('/summary', authenticate, async (req, res) => {
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

// Rota autenticada para buscar os álbuns do usuário
app.get('/user-albums', authenticate, async (req, res) => {
    try {
        // Busca o usuário autenticado
        const user = await User.findOne({
            where: { username: req.userId },
            attributes: ['id'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Busca os UserAlbums do usuário
        const userAlbums = await UserAlbum.findAll({
            where: { userId: user.id },
            attributes: ['id', 'albumTemplateId'],
        });

        // Busca informações dos AlbumTemplates relacionados
        const albumTemplateIds = userAlbums.map(album => album.albumTemplateId);

        const albumTemplates = await AlbumTemplate.findAll({
            where: { id: albumTemplateIds },
            attributes: ['id', 'name', 'image', 'tags'],
        });

        // Junta os dados dos UserAlbums com os AlbumTemplates
        const albums = userAlbums.map(userAlbum => {
            const template = albumTemplates.find(t => t.id === userAlbum.albumTemplateId);
            return {
                id: userAlbum.id,
                albumTemplateId: userAlbum.albumTemplateId,
                ...template?.toJSON(),
            };
        });

        res.status(200).json(albums);
    } catch (error) {
        console.error('Error fetching user albums:', error);
        res.status(500).json({ message: 'Error fetching user albums', error });
    }
});

// Rota autenticada para atualizar o estado e a cidade do usuário
app.post('/region', authenticate, async (req, res) => {
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
app.get('/users/by-region', authenticate, async (req, res) => {
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

app.get('/template-albums', authenticate, async (req, res) => {
    try {
        const templateAlbums = await AlbumTemplate.findAll({
            attributes: ['id', 'name', 'image', 'tags'],
        });
        res.status(200).json(templateAlbums);
    } catch (error) {
        console.error('Error fetching template albums:', error);
        res.status(500).json({ message: 'Error fetching template albums', error });
    }
});

// Rota autenticada para adicionar um álbum ao usuário
app.post('/add-album/:albumTemplateId', authenticate, async (req, res) => {
    const { albumTemplateId } = req.params;

    try {
        // Busca o usuário autenticado
        const user = await User.findOne({ where: { username: req.userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verifica se o AlbumTemplate existe
        const albumTemplate = await AlbumTemplate.findOne({ where: { id: albumTemplateId } });
        if (!albumTemplate) {
            return res.status(404).json({ message: 'AlbumTemplate not found' });
        }

        // Cria o novo UserAlbum
        const newUserAlbum = await UserAlbum.create({
            userId: user.id,
            albumTemplateId: albumTemplate.id,
        });

        res.status(201).json({ message: 'Album added to user successfully', userAlbum: newUserAlbum });
    } catch (error) {
        console.error('Error adding album to user:', error);
        res.status(500).json({ message: 'Error adding album to user', error });
    }
});

// Rota autenticada para verificar token
app.get('/protected', authenticate, (req, res) => {
    try {
        res.json({ message: 'Token is valid', userId: req.userId });
    } catch (error) {
        console.error('Error in protected route:', error);
        return res.status(500).json({ message: 'Error in your token', error });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
