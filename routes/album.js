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

router.get('/external-user-albums/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;

        // Permite buscar por id numérico ou username
        let user;
        if (/^\d+$/.test(userId)) {
            user = await User.findOne({ where: { id: Number(userId) }, attributes: ['id'] });
        } else {
            user = await User.findOne({ where: { username: userId }, attributes: ['id'] });
        }

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
        const { page = 1, maxStickers = 100, ownership, terms } = req.query;

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

        // Busca TODOS os stickers do usuário para este álbum, incluindo dados do TemplateSticker
        const userStickers = await UserSticker.findAll({
            where: { userAlbumId: userAlbum.id },
            attributes: ['id', 'quantity', 'templateStickerId'],
            include: [{
                model: TemplateSticker,
                attributes: ['id', 'category', 'tags', 'order', 'number', 'albumTemplateId']
            }]
        });

        // Se o álbum não for do usuário autenticado, buscar os stickers do usuário autenticado para o mesmo template
        let myStickersMap = {};
        let externalStickersMap = {};
        const isExternal = userAlbum.userId !== req.userId;

        if (isExternal) {
            // Busca o álbum do usuário autenticado para esse template
            let myUserId = req.userId;
            if (typeof myUserId !== 'number') {
                const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
                myUserId = me?.id;
            }
            
            // Depois use:
            const myUserAlbum = await UserAlbum.findOne({
                where: { userId: myUserId, albumTemplateId: userAlbum.albumTemplateId },
                attributes: ['id']
            });

            if (myUserAlbum) {
                // Busca os stickers do usuário autenticado para esse álbum
                const myStickers = await UserSticker.findAll({
                    where: { userAlbumId: myUserAlbum.id },
                    attributes: ['id', 'quantity', 'templateStickerId']
                });
                myStickersMap = {};
                for (const s of myStickers) {
                    myStickersMap[s.templateStickerId] = s;
                }
            }

            // Também cria um map dos stickers do usuário externo para facilitar consulta inversa
            for (const s of userStickers) {
                externalStickersMap[s.templateStickerId] = s;
            }
        }

        // Monta o array stickersList com os dados combinados
        let allStickers = userStickers.map(userSticker => {
            const base = {
                id: userSticker.id,
                quantity: userSticker.quantity,
                templateStickerId: userSticker.templateStickerId,
                category: userSticker.TemplateSticker?.category,
                tags: userSticker.TemplateSticker?.tags,
                order: userSticker.TemplateSticker?.order,
                number: userSticker.TemplateSticker?.number,
                albumTemplateId: userSticker.TemplateSticker?.albumTemplateId
            };

            if (isExternal) {
                // youNeed: eu (autenticado) quantity = 0, externo quantity > 1
                const mySticker = myStickersMap[userSticker.templateStickerId];
                base.youNeed = (!mySticker || mySticker.quantity === 0) && userSticker.quantity > 1;

                // youHave: eu (autenticado) quantity > 1, externo quantity = 0
                base.youHave = (mySticker && mySticker.quantity > 1) && userSticker.quantity === 0;
            }

            return base;
        });

        // Ordena SEMPRE pelo atributo 'order'
        allStickers = allStickers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // APLICAR FILTROS
        let filteredStickers = allStickers;

        // Filtro por ownership
        if (ownership) {
            switch (ownership) {
                case 'collected':
                    filteredStickers = filteredStickers.filter(s => s.quantity > 0);
                    break;
                case 'missing':
                    filteredStickers = filteredStickers.filter(s => s.quantity === 0);
                    break;
                case 'duplicate':
                    filteredStickers = filteredStickers.filter(s => s.quantity > 1);
                    break;
            }
        }

        // Filtro por terms
        if (terms) {
            const searchTerm = terms.toLowerCase();
            filteredStickers = filteredStickers.filter(sticker => {
                const number = sticker?.number || '';
                const category = sticker?.category || '';
                const tags = sticker?.tags || [];

                return number.toString().includes(searchTerm) ||
                    category.includes(searchTerm) ||
                    tags.includes(searchTerm);
            });
        }

        // PAGINAÇÃO HÍBRIDA: Agrupa por categoria CONTÍNUA respeitando a ordem
        const groupedByCategory = [];
        let currentGroup = null;
        
        filteredStickers.forEach(sticker => {
            const category = sticker.category || 'Sem Categoria';
            
            // Se é a primeira vez ou mudou a categoria, inicia um novo grupo
            if (!currentGroup || currentGroup.category !== category) {
                currentGroup = {
                    category: category,
                    stickers: [sticker],
                    startOrder: sticker.order,
                    endOrder: sticker.order
                };
                groupedByCategory.push(currentGroup);
            } else {
                // Verifica se há uma quebra grande na sequência (gap > 50)
                const gap = sticker.order - currentGroup.endOrder;
                if (gap > 50) {
                    // Cria um novo grupo para a mesma categoria (devido à quebra)
                    currentGroup = {
                        category: `${category} (${Math.floor(sticker.order / 100)}xx)`, // Adiciona indicador da faixa
                        stickers: [sticker],
                        startOrder: sticker.order,
                        endOrder: sticker.order
                    };
                    groupedByCategory.push(currentGroup);
                } else {
                    // Continua no mesmo grupo
                    currentGroup.stickers.push(sticker);
                    currentGroup.endOrder = sticker.order;
                }
            }
        });

        // Cria lotes de grupos respeitando o maxStickers
        const categoryBatches = [];
        let currentBatch = { categories: [], totalStickers: 0 };
        
        groupedByCategory.forEach(group => {
            const groupStickersCount = group.stickers.length;
            
            // Se adicionar este grupo ultrapassar o limite e já tem grupos no lote atual
            if (currentBatch.totalStickers + groupStickersCount > maxStickers && currentBatch.categories.length > 0) {
                categoryBatches.push(currentBatch);
                currentBatch = { categories: [], totalStickers: 0 };
            }
            
            // Adiciona o grupo ao lote atual
            currentBatch.categories.push({
                name: group.category,
                stickers: group.stickers,
                count: groupStickersCount,
                orderRange: `${group.startOrder}-${group.endOrder}`
            });
            currentBatch.totalStickers += groupStickersCount;
        });
        
        // Adiciona o último lote se não estiver vazio
        if (currentBatch.categories.length > 0) {
            categoryBatches.push(currentBatch);
        }

        // Seleciona a página solicitada
        const pageNumber = parseInt(page) || 1;
        const totalBatches = categoryBatches.length;
        const currentPageIndex = pageNumber - 1;
        
        if (currentPageIndex >= totalBatches || currentPageIndex < 0) {
            return res.status(404).json({ message: 'Page not found' });
        }
        
        const currentBatchData = categoryBatches[currentPageIndex];
        
        // Monta a lista final de stickers para esta página
        const stickersList = currentBatchData.categories.flatMap(cat => cat.stickers);
        
        const totalStickers = allStickers.length;
        const totalFilteredStickers = filteredStickers.length;
        const completedStickers = allStickers.filter(s => s.quantity > 0).length;
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
            totalFilteredStickers,
            percentCompleted,
            filters: {
                ownership: ownership || null,
                terms: terms || null
            },
            pagination: {
                currentPage: pageNumber,
                totalPages: totalBatches,
                stickersInPage: stickersList.length,
                maxStickersPerPage: parseInt(maxStickers),
                categoriesInPage: currentBatchData.categories.map(cat => ({
                    name: cat.name,
                    count: cat.count,
                    orderRange: cat.orderRange
                }))
            }
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

        // Para cada álbum, conta quantos stickers existem no template
        const albumsWithStickersCount = await Promise.all(
            templateAlbums.map(async album => {
                const totalStickers = await TemplateSticker.count({
                    where: { albumTemplateId: album.id }
                });
                return {
                    ...album.toJSON(),
                    totalStickers
                };
            })
        );

        res.status(200).json(albumsWithStickersCount);
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

router.post('/user-sticker/batch-update', authenticate, async (req, res) => {
    try {
        const { stickersToUpdate } = req.body;
        if (!Array.isArray(stickersToUpdate) || stickersToUpdate.length === 0) {
            return res.status(400).json({ message: 'No stickers to update' });
        }

        // Atualiza cada sticker individualmente
        await Promise.all(
            stickersToUpdate.map(async ({ id, quantity }) => {
                await UserSticker.update(
                    { quantity },
                    { where: { id } }
                );
            })
        );

        res.status(200).json({ message: 'Stickers updated successfully' });
    } catch (error) {
        console.error('Error updating stickers:', error);
        res.status(500).json({ message: 'Error updating stickers', error });
    }
});

module.exports = router;
