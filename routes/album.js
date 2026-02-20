const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const albumController = require('../controllers/albumController');
const validate = require('../middlewares/validator');
const {
  albumDetailsQuerySchema,
  albumTemplateIdParamSchema,
  batchUpdateStickersSchema,
  userAlbumIdParamSchema,
  externalUserIdParamSchema
} = require('../validators/schemas/album.schema');

router.get('/user-albums', authenticate, albumController.getUserAlbums);
router.get('/external-user-albums/:userId', authenticate, validate(externalUserIdParamSchema, 'params'), albumController.getExternalUserAlbums);
router.get('/album-details/:userAlbumId', authenticate, validate(userAlbumIdParamSchema, 'params'), validate(albumDetailsQuerySchema, 'query'), albumController.getAlbumDetails);
router.get('/template-albums', authenticate, albumController.getTemplateAlbums);
router.post('/add-album/:albumTemplateId', authenticate, validate(albumTemplateIdParamSchema, 'params'), albumController.addAlbum);
router.post('/user-sticker/batch-update', authenticate, validate(batchUpdateStickersSchema), albumController.batchUpdateStickers);

module.exports = router;
