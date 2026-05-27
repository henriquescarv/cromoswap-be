const Joi = require('joi');

const updateLocationSchema = Joi.object({
  latitude: Joi.number().required(),
  longitude: Joi.number().required()
});

const updateProfileSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Email must be a valid email address'
    }),
  verifiedToken: Joi.string().optional(),
  profilePicture: Joi.string().optional().allow('')
}).min(1); // Pelo menos um campo deve ser fornecido

const userIdParamSchema = Joi.object({
  userId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().min(1)
    )
    .required()
});

const notificationSeenSchema = Joi.object({
  notificationIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one notification ID is required'
    })
});

const deleteNotificationsSchema = Joi.object({
  notificationIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one notification ID is required'
    })
});

module.exports = {
  updateLocationSchema,
  updateProfileSchema,
  userIdParamSchema,
  notificationSeenSchema,
  deleteNotificationsSchema
};
