const Joi = require('joi');

const updateRegionSchema = Joi.object({
  countryState: Joi.string().required(),
  city: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Email must be a valid email address'
    }),
  countryState: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
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
  updateRegionSchema,
  updateProfileSchema,
  userIdParamSchema,
  notificationSeenSchema,
  deleteNotificationsSchema
};
