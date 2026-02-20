
const validate = (schema, property = 'body') => {
  return (req, res, next) => {

    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Retorna todos os erros, nÃ£o apenas o primeiro
      stripUnknown: true // Remove propriedades nÃ£o definidas no schema
    });

    if (error) {

      const errorMessages = error.details.map(detail => detail.message);

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = validate;
