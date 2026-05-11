const { User, PasswordReset, OTPRequest } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateOTP, sendOTPEmail } = require('../services/sesService');
const config = require('../config/environment');

exports.checkUserExists = async (req, res) => {
  const { type, value } = req.body;

  try {
    if (type === 'EMAIL') {
      const user = await User.findOne({ where: { email: value } });
      return res.status(200).json({ exists: !!user });
    } else if (type === 'USERNAME') {
      const user = await User.findOne({ where: { username: value } });
      return res.status(200).json({ exists: !!user });
    } else {
      return res.status(400).json({ message: 'Invalid type. Use EMAIL or USERNAME' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking user', error: error.message });
  }
};

exports.sendOTP = async (req, res) => {
  const { email, purpose } = req.body;

  try {
    await OTPRequest.update(
      { used: true },
      { where: { email, purpose, used: false } }
    );

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTPRequest.create({ email, otp, purpose, expiresAt, used: false });

    await sendOTPEmail(email, otp, purpose);

    res.status(200).json({ message: 'OTP enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar OTP:', error);
    res.status(500).json({ message: 'Erro ao enviar OTP', error: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp, purpose } = req.body;

  try {
    const record = await OTPRequest.findOne({
      where: { email, otp, purpose, used: false },
      order: [['createdAt', 'DESC']]
    });

    if (!record) {
      return res.status(400).json({ message: 'Código inválido' });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ message: 'Código expirado' });
    }

    await record.update({ used: true });

    const verifiedToken = jwt.sign(
      { email, purpose, type: 'otp_verified' },
      config.jwt.secret,
      { expiresIn: '15m' }
    );

    res.status(200).json({ message: 'Código válido', verifiedToken });
  } catch (error) {
    console.error('Erro ao verificar OTP:', error);
    res.status(500).json({ message: 'Erro ao verificar OTP', error: error.message });
  }
};

exports.register = async (req, res) => {
  const { username, email, password, verifiedToken } = req.body;

  try {
    let decoded;
    try {
      decoded = jwt.verify(verifiedToken, config.jwt.secret);
    } catch (e) {
      return res.status(401).json({ message: 'Token de verificação inválido ou expirado' });
    }

    if (decoded.type !== 'otp_verified' || decoded.purpose !== 'register' || decoded.email !== email) {
      return res.status(401).json({ message: 'Token de verificação inválido' });
    }

    const user = await User.findOne({ where: { username } });
    const emailExists = await User.findOne({ where: { email } });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newUser.username }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const refreshToken = jwt.sign({ id: newUser.username }, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn });

    newUser.refreshToken = refreshToken;
    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).json({ message: 'Error registering user', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.username }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const refreshToken = jwt.sign({ id: user.username }, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn });

    user.refreshToken = refreshToken;
    await user.save();

    res.json({ message: 'Login successful', token, refreshToken });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(400).json({ message: 'Error logging in', error: error.message });
  }
};

exports.protected = (req, res) => {
  res.status(200).json({
    message: 'Access granted to protected route',
    user: req.userId
  });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'Email não encontrado' });
    }

    await OTPRequest.update(
      { used: true },
      { where: { email, purpose: 'reset_password', used: false } }
    );

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTPRequest.create({ email, otp, purpose: 'reset_password', expiresAt, used: false });

    await sendOTPEmail(email, otp, 'reset_password');

    res.status(200).json({ message: 'Código enviado para o email' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ message: 'Erro ao enviar código', error: error.message });
  }
};

exports.validateResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const record = await OTPRequest.findOne({
      where: { email, otp: code, purpose: 'reset_password', used: false },
      order: [['createdAt', 'DESC']]
    });

    if (!record) {
      return res.status(400).json({ message: 'Código inválido' });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ message: 'Código expirado' });
    }

    await record.update({ used: true });

    const verifiedToken = jwt.sign(
      { email, purpose: 'reset_password', type: 'otp_verified' },
      config.jwt.secret,
      { expiresIn: '15m' }
    );

    res.status(200).json({ message: 'Código válido', verifiedToken });
  } catch (error) {
    console.error('Erro ao validar código:', error);
    res.status(500).json({ message: 'Erro ao validar código', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, verifiedToken, newPassword } = req.body;

  try {
    let decoded;
    try {
      decoded = jwt.verify(verifiedToken, config.jwt.secret);
    } catch (e) {
      return res.status(401).json({ message: 'Token de verificação inválido ou expirado' });
    }

    if (decoded.type !== 'otp_verified' || decoded.purpose !== 'reset_password' || decoded.email !== email) {
      return res.status(401).json({ message: 'Token de verificação inválido' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    await user.update({ password: hashedPassword });

    res.status(200).json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ message: 'Erro ao resetar senha', error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret);

    const user = await User.findOne({ where: { username: decoded.id } });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newToken = jwt.sign({ id: user.username }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};
