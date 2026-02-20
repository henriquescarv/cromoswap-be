const Joi = require('joi');

const checkUserExistsSchema = Joi.object({
  type: Joi.string().valid('EMAIL', 'USERNAME').required(),
  value: Joi.string().required()
});

const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must be at most 30 characters long'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long'
    }),
  countryState: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow('')
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address'
    })
});

const validateResetCodeSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address'
    }),
  code: Joi.string()
    .length(6)
    .required()
    .messages({
      'string.length': 'Code must be exactly 6 characters long'
    })
});

const resetPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address'
    }),
  code: Joi.string()
    .length(6)
    .required()
    .messages({
      'string.length': 'Code must be exactly 6 characters long'
    }),
  newPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long'
    })
});

module.exports = {
  checkUserExistsSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  validateResetCodeSchema,
  resetPasswordSchema
};
