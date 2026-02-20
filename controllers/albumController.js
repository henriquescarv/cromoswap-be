const { User, UserAlbum, AlbumTemplate, TemplateSticker, UserSticker } = require('../models');
const { Op } = require('sequelize');

exports.getUserAlbums = async (req, res) => {
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

    const albums = await Promise.all(userAlbums.map(async userAlbum => {
      const template = albumTemplates.find(t => t.id === userAlbum.albumTemplateId);

      const totalStickers = await UserSticker.count({
        where: { userAlbumId: userAlbum.id }
      });

      const completedStickers = await UserSticker.count({
        where: {
          userAlbumId: userAlbum.id,
          quantity: { [Op.gt]: 0 }
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
};

exports.getExternalUserAlbums = async (req, res) => {
  try {
    const { userId } = req.params;
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

    const albums = await Promise.all(userAlbums.map(async userAlbum => {
      const template = albumTemplates.find(t => t.id === userAlbum.albumTemplateId);

      const totalStickers = await UserSticker.count({
        where: { userAlbumId: userAlbum.id }
      });
      const completedStickers = await UserSticker.count({
        where: {
          userAlbumId: userAlbum.id,
          quantity: { [Op.gt]: 0 }
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
};

exports.getAlbumDetails = async (req, res) => {
  try {
    const { userAlbumId } = req.params;
    const { page = 1, maxStickers = 100, ownership, terms } = req.query;

    const userAlbum = await UserAlbum.findOne({
      where: { id: userAlbumId },
      attributes: ['id', 'albumTemplateId', 'userId'],
    });
    if (!userAlbum) {
      return res.status(404).json({ message: 'UserAlbum not found' });
    }

    const template = await AlbumTemplate.findOne({
      where: { id: userAlbum.albumTemplateId },
      attributes: ['id', 'name', 'image', 'tags'],
    });

    const userStickers = await UserSticker.findAll({
      where: { userAlbumId: userAlbum.id },
      attributes: ['id', 'quantity', 'templateStickerId'],
      include: [{
        model: TemplateSticker,
        attributes: ['id', 'category', 'tags', 'order', 'number', 'albumTemplateId']
      }]
    });

    let myStickersMap = {};
    let externalStickersMap = {};
    const isExternal = userAlbum.userId !== req.userId;

    if (isExternal) {

      let myUserId = req.userId;
      if (typeof myUserId !== 'number') {
        const me = await User.findOne({ where: { username: req.userId }, attributes: ['id'] });
        myUserId = me?.id;
      }

      const myUserAlbum = await UserAlbum.findOne({
        where: { userId: myUserId, albumTemplateId: userAlbum.albumTemplateId },
        attributes: ['id']
      });

      if (myUserAlbum) {

        const myStickers = await UserSticker.findAll({
          where: { userAlbumId: myUserAlbum.id },
          attributes: ['id', 'quantity', 'templateStickerId']
        });
        myStickersMap = {};
        for (const s of myStickers) {
          myStickersMap[s.templateStickerId] = s;
        }
      }

      for (const s of userStickers) {
        externalStickersMap[s.templateStickerId] = s;
      }
    }

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

        const mySticker = myStickersMap[userSticker.templateStickerId];
        base.youNeed = (!mySticker || mySticker.quantity === 0) && userSticker.quantity > 1;

        base.youHave = (mySticker && mySticker.quantity > 1) && userSticker.quantity === 0;
      }

      return base;
    });

    allStickers = allStickers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    let filteredStickers = allStickers;

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
        case 'you_need':

          if (isExternal) {
            filteredStickers = filteredStickers.filter(s => s.youNeed);
          }
          break;
        case 'you_have':

          if (isExternal) {
            filteredStickers = filteredStickers.filter(s => s.youHave);
          }
          break;
      }
    }

    if (terms) {
      const searchTerm = terms.toLowerCase();
      filteredStickers = filteredStickers.filter(sticker => {
        const number = sticker?.number || '';
        const category = sticker?.category.toLowerCase() || '';
        const tags = sticker?.tags || [];

        return number.toString().includes(searchTerm) ||
          category.includes(searchTerm) ||
          tags.includes(searchTerm);
      });
    }

    const groupedByCategory = [];
    let currentGroup = null;

    filteredStickers.forEach(sticker => {
      const category = sticker.category || 'Sem Categoria';

      if (!currentGroup || currentGroup.category !== category) {
        currentGroup = {
          category: category,
          stickers: [sticker],
          startOrder: sticker.order,
          endOrder: sticker.order
        };
        groupedByCategory.push(currentGroup);
      } else {

        const gap = sticker.order - currentGroup.endOrder;
        if (gap > 50) {

          currentGroup = {
            category: `${category} (${Math.floor(sticker.order / 100)}xx)`, // Adiciona indicador da faixa
            stickers: [sticker],
            startOrder: sticker.order,
            endOrder: sticker.order
          };
          groupedByCategory.push(currentGroup);
        } else {

          currentGroup.stickers.push(sticker);
          currentGroup.endOrder = sticker.order;
        }
      }
    });

    const categoryBatches = [];
    let currentBatch = { categories: [], totalStickers: 0 };

    groupedByCategory.forEach(group => {
      const groupStickersCount = group.stickers.length;

      if (groupStickersCount > maxStickers) {

        if (currentBatch.categories.length > 0) {
          categoryBatches.push(currentBatch);
          currentBatch = { categories: [], totalStickers: 0 };
        }

        let remainingStickers = [...group.stickers];
        let partIndex = 1;

        while (remainingStickers.length > 0) {
          const chunk = remainingStickers.slice(0, maxStickers);
          remainingStickers = remainingStickers.slice(maxStickers);

          const chunkStartOrder = chunk[0].order;
          const chunkEndOrder = chunk[chunk.length - 1].order;

          categoryBatches.push({
            categories: [{
              name: remainingStickers.length > 0
                ? `${group.category} (parte ${partIndex})`
                : group.category,
              stickers: chunk,
              count: chunk.length,
              orderRange: `${chunkStartOrder}-${chunkEndOrder}`
            }],
            totalStickers: chunk.length
          });

          partIndex++;
        }
      } else {

        if (currentBatch.totalStickers + groupStickersCount > maxStickers && currentBatch.categories.length > 0) {
          categoryBatches.push(currentBatch);
          currentBatch = { categories: [], totalStickers: 0 };
        }

        currentBatch.categories.push({
          name: group.category,
          stickers: group.stickers,
          count: groupStickersCount,
          orderRange: `${group.startOrder}-${group.endOrder}`
        });
        currentBatch.totalStickers += groupStickersCount;
      }
    });

    if (currentBatch.categories.length > 0) {
      categoryBatches.push(currentBatch);
    }

    const pageNumber = parseInt(page) || 1;
    const totalBatches = categoryBatches.length;
    const currentPageIndex = pageNumber - 1;

    if (currentPageIndex >= totalBatches || currentPageIndex < 0) {
      return res.status(404).json({ message: 'Page not found' });
    }

    const currentBatchData = categoryBatches[currentPageIndex];

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
};

exports.getTemplateAlbums = async (req, res) => {
  try {
    const templateAlbums = await AlbumTemplate.findAll({
      attributes: ['id', 'name', 'image', 'tags'],
    });

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
};

exports.addAlbum = async (req, res) => {
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

    const templateStickers = await TemplateSticker.findAll({
      where: { albumTemplateId: albumTemplate.id }
    });

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
};

exports.batchUpdateStickers = async (req, res) => {
  try {
    const { stickersToUpdate } = req.body;
    if (!Array.isArray(stickersToUpdate) || stickersToUpdate.length === 0) {
      return res.status(400).json({ message: 'No stickers to update' });
    }

    const user = await User.findOne({
      where: { username: req.userId },
      attributes: ['id']
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stickerIds = stickersToUpdate.map(s => s.id);
    const userStickers = await UserSticker.findAll({
      where: { id: stickerIds },
      attributes: ['id', 'userAlbumId'],
      include: [{
        model: UserAlbum,
        attributes: ['userId'],
        required: true
      }]
    });

    if (userStickers.length !== stickerIds.length) {
      return res.status(404).json({ message: 'Some stickers not found' });
    }

    const unauthorizedStickers = userStickers.filter(sticker =>
      sticker.UserAlbum.userId !== user.id
    );

    if (unauthorizedStickers.length > 0) {
      return res.status(403).json({
        message: 'Unauthorized: You can only update stickers from your own albums'
      });
    }

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
};
