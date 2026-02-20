const { User, PasswordReset } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const config = require('../config/environment');

const resend = new Resend(config.email.resendApiKey);

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

exports.register = async (req, res) => {
  const { username, email, password, countryState, city } = req.body;

  try {
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
      countryState,
      city
    });

    const token = jwt.sign({ id: newUser.username }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(201).json({
      message: 'User registered successfully',
      token
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

    res.json({ message: 'Login successful', token });
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
      return res.status(404).json({ message: 'Email nÃ£o encontrado' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordReset.update(
      { used: true },
      {
        where: {
          email,
          used: false
        }
      }
    );

    await PasswordReset.create({
      email,
      code,
      expiresAt,
      used: false
    });

    await resend.emails.send({
      from: 'noreply@cromoswap.app',
      to: email,
      subject: 'CÃ³digo de recuperaÃ§Ã£o de senha - CromoSwap',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>RecuperaÃ§Ã£o de senha</h2>
          <p>VocÃª solicitou a recuperaÃ§Ã£o de senha da sua conta no CromoSwap.</p>
          <p>Use o cÃ³digo abaixo para prosseguir:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>Este cÃ³digo expira em 15 minutos.</p>
          <p>Se vocÃª nÃ£o solicitou esta recuperaÃ§Ã£o, ignore este email.</p>
        </div>
      `
    });

    res.status(200).json({ message: 'CÃ³digo enviado para o email' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ message: 'Erro ao enviar cÃ³digo', error: error.message });
  }
};

exports.validateResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const passwordReset = await PasswordReset.findOne({
      where: {
        email,
        code,
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!passwordReset) {
      return res.status(400).json({ message: 'CÃ³digo invÃ¡lido' });
    }

    if (new Date() > passwordReset.expiresAt) {
      return res.status(400).json({ message: 'CÃ³digo expirado' });
    }

    res.status(200).json({ message: 'CÃ³digo vÃ¡lido' });
  } catch (error) {
    console.error('Erro ao validar cÃ³digo:', error);
    res.status(500).json({ message: 'Erro ao validar cÃ³digo', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const passwordReset = await PasswordReset.findOne({
      where: {
        email,
        code,
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!passwordReset) {
      return res.status(400).json({ message: 'CÃ³digo invÃ¡lido' });
    }

    if (new Date() > passwordReset.expiresAt) {
      return res.status(400).json({ message: 'CÃ³digo expirado' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'UsuÃ¡rio nÃ£o encontrado' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    await user.update({ password: hashedPassword });

    await passwordReset.update({ used: true });

    res.status(200).json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ message: 'Erro ao resetar senha', error: error.message });
  }
};
