const Joi = require('joi');

const albumDetailsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  maxStickers: Joi.number().integer().min(1).max(500).optional().default(100),
  ownership: Joi.string()
    .valid('collected', 'missing', 'duplicate', 'you_need', 'you_have')
    .optional(),
  terms: Joi.string().optional().allow('')
});

const albumTemplateIdParamSchema = Joi.object({
  albumTemplateId: Joi.number().integer().positive().required()
});

const batchUpdateStickersSchema = Joi.object({
  stickersToUpdate: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(0).max(999).required()
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one sticker must be provided'
    })
});

const userAlbumIdParamSchema = Joi.object({
  userAlbumId: Joi.number().integer().positive().required()
});

const externalUserIdParamSchema = Joi.object({
  userId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().min(1)
    )
    .required()
});

module.exports = {
  albumDetailsQuerySchema,
  albumTemplateIdParamSchema,
  batchUpdateStickersSchema,
  userAlbumIdParamSchema,
  externalUserIdParamSchema
};
