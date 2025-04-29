const express = require('express');
const router = express.Router();
const { User, UserAlbum, AlbumTemplate, TemplateSticker, UserSticker } = require('../db.js');
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

// Rota autenticada para buscar os álbuns do usuário
router.get('/user-albums', authenticate, async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.userId },
            attributes: ['id'],
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userAlbums = await UserAlbum.findAll({
            where: { userId: user.id },
            attributes: ['id', 'albumTemplateId'],
        });

        const albumTemplateIds = userAlbums.map(album => album.albumTemplateId);
        const albumTemplates = await AlbumTemplate.findAll({
            where: { id: albumTemplateIds },
            attributes: ['id', 'name', 'image', 'tags'],
        });

        // Para cada álbum do usuário, busca apenas a contagem de stickers e a porcentagem completa
        const albums = await Promise.all(userAlbums.map(async userAlbum => {
            const template = albumTemplates.find(t => t.id === userAlbum.albumTemplateId);

            // Busca a quantidade total de stickers e os completos para este álbum
            const totalStickers = await UserSticker.count({
                where: { userAlbumId: userAlbum.id }
            });
            const completedStickers = await UserSticker.count({
                where: {
                    userAlbumId: userAlbum.id,
                    quantity: { [require('sequelize').Op.gt]: 0 }
                }
            });
            const percentCompleted = totalStickers > 0
                ? Math.round((completedStickers / totalStickers) * 100)
                : 0;

            return {
                userAlbumId: userAlbum.id,
                albumTemplateId: userAlbum.albumTemplateId,
                ...template?.toJSON(),
                totalStickers,
                percentCompleted
            };
        }));

        res.status(200).json(albums);
    } catch (error) {
        console.error('Error fetching user albums:', error);
        res.status(500).json({ message: 'Error fetching user albums', error });
    }
});

router.get('/album-details/:userAlbumId', authenticate, async (req, res) => {
    try {
        const { userAlbumId } = req.params;

        // Busca o UserAlbum
        const userAlbum = await UserAlbum.findOne({
            where: { id: userAlbumId },
            attributes: ['id', 'albumTemplateId', 'userId'],
        });
        if (!userAlbum) {
            return res.status(404).json({ message: 'UserAlbum not found' });
        }

        // Busca o template do álbum
        const template = await AlbumTemplate.findOne({
            where: { id: userAlbum.albumTemplateId },
            attributes: ['id', 'name', 'image', 'tags'],
        });

        // Busca os stickers do usuário para este álbum, incluindo dados do TemplateSticker
        const userStickers = await UserSticker.findAll({
            where: { userAlbumId: userAlbum.id },
            attributes: ['id', 'quantity', 'templateStickerId'],
            include: [{
                model: TemplateSticker,
                attributes: ['id', 'category', 'tags', 'order', 'number', 'albumTemplateId']
            }]
        });

        // Monta o array stickersList com os dados combinados
        const stickersList = userStickers.map(userSticker => ({
            id: userSticker.id,
            quantity: userSticker.quantity,
            templateStickerId: userSticker.templateStickerId,
            // Atributos do TemplateSticker:
            category: userSticker.TemplateSticker?.category,
            tags: userSticker.TemplateSticker?.tags,
            order: userSticker.TemplateSticker?.order,
            number: userSticker.TemplateSticker?.number,
            albumTemplateId: userSticker.TemplateSticker?.albumTemplateId
        }));

        const totalStickers = stickersList.length;
        const completedStickers = stickersList.filter(s => s.quantity > 0).length;
        const percentCompleted = totalStickers > 0
            ? Math.round((completedStickers / totalStickers) * 100)
            : 0;

        res.status(200).json({
            id: userAlbum.id,
            albumTemplateId: userAlbum.albumTemplateId,
            userId: userAlbum.userId,
            ...template?.toJSON(),
            stickersList,
            totalStickers,
            percentCompleted
        });
    } catch (error) {
        console.error('Error fetching album details:', error);
        res.status(500).json({ message: 'Error fetching album details', error });
    }
});

// Rota autenticada para buscar todos os templates de álbuns
router.get('/template-albums', authenticate, async (req, res) => {
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
router.post('/add-album/:albumTemplateId', authenticate, async (req, res) => {
    const { albumTemplateId } = req.params;
    try {
        const user = await User.findOne({ where: { username: req.userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const albumTemplate = await AlbumTemplate.findOne({ where: { id: albumTemplateId } });
        if (!albumTemplate) {
            return res.status(404).json({ message: 'AlbumTemplate not found' });
        }
        const newUserAlbum = await UserAlbum.create({
            userId: user.id,
            albumTemplateId: albumTemplate.id,
        });

        // Busca todos os stickers do template desse álbum
        const templateStickers = await TemplateSticker.findAll({
            where: { albumTemplateId: albumTemplate.id }
        });

        // Cria UserSticker para cada TemplateSticker
        const userStickers = await Promise.all(
            templateStickers.map(sticker =>
                UserSticker.create({
                    userAlbumId: newUserAlbum.id,
                    templateStickerId: sticker.id,
                    quantity: 0,
                })
            )
        );

        res.status(201).json({
            message: 'Album added to user successfully',
            userAlbum: newUserAlbum,
            userStickers
        });
    } catch (error) {
        console.error('Error adding album to user:', error);
        res.status(500).json({ message: 'Error adding album to user', error });
    }
});

module.exports = router;
