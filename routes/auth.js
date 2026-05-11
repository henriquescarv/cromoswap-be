const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validator');
const {
  sendOTPSchema,
  verifyOTPSchema,
  checkUserExistsSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  validateResetCodeSchema,
  resetPasswordSchema
} = require('../validators/schemas/auth.schema');

router.post('/send-otp', validate(sendOTPSchema), authController.sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);

router.post('/check-user-exists', validate(checkUserExistsSchema), authController.checkUserExists);

router.post('/register', validate(registerSchema), authController.register);

router.post('/login', validate(loginSchema), authController.login);

router.get('/protected', authenticate, authController.protected);

router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/validate-reset-code', validate(validateResetCodeSchema), authController.validateResetCode);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
