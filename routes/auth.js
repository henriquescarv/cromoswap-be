const express = require('express');
const router = express.Router();
const { User, PasswordReset } = require('../db.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

// Verificar se username ou email já existe
router.post('/check-user-exists', async (req, res) => {
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
});

// Registrar novo usuário
router.post('/register', async (req, res) => {
  const { username, email, password, countryState, city } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    const emailExists = await User.findOne({ where: { email } });

    if (!!user) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    if (!!emailExists) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }
    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = await User.create({ username, email, password: hashedPassword, countryState, city });
    const token = jwt.sign({ id: newUser.username }, SECRET_KEY, { expiresIn: '1h' });
    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Error registering user', error });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  try {
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    const token = jwt.sign({ id: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(400).json({ message: 'Error logging in', error });
  }
});

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(403).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'INVALID_TOKEN' }); // <-- Aqui
    }
    req.userId = decoded.id;
    next();
  });
};

// Exemplo de rota protegida
router.get('/protected', authenticate, (req, res) => {
  res.status(200).json({ message: 'Access granted to protected route', user: req.userId });
});

// Gerar código e enviar email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Verificar se email existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email não encontrado' });
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiração: 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidar todos os códigos anteriores deste email que ainda não foram usados
    await PasswordReset.update(
      { used: true },
      {
        where: {
          email,
          used: false
        }
      }
    );

    // Salvar código no banco
    await PasswordReset.create({
      email,
      code,
      expiresAt,
      used: false
    });

    // Enviar email via Resend
    await resend.emails.send({
      from: 'noreply@cromoswap.app',
      to: email,
      subject: 'Código de recuperação de senha - CromoSwap',
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Recuperação de senha</h2>
                    <p>Você solicitou a recuperação de senha da sua conta no CromoSwap.</p>
                    <p>Use o código abaixo para prosseguir:</p>
                    <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${code}
                    </div>
                    <p>Este código expira em 15 minutos.</p>
                    <p>Se você não solicitou esta recuperação, ignore este email.</p>
                </div>
            `
    });

    res.status(200).json({ message: 'Código enviado para o email' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ message: 'Erro ao enviar código', error: error.message });
  }
});

// Validar código (sem resetar senha)
router.post('/validate-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    // Buscar código válido
    const passwordReset = await PasswordReset.findOne({
      where: {
        email,
        code,
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!passwordReset) {
      return res.status(400).json({ message: 'Código inválido' });
    }

    // Verificar se expirou
    if (new Date() > passwordReset.expiresAt) {
      return res.status(400).json({ message: 'Código expirado' });
    }

    res.status(200).json({ message: 'Código válido' });
  } catch (error) {
    console.error('Erro ao validar código:', error);
    res.status(500).json({ message: 'Erro ao validar código', error: error.message });
  }
});

// Validar código e resetar senha
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // Buscar código válido
    const passwordReset = await PasswordReset.findOne({
      where: {
        email,
        code,
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!passwordReset) {
      return res.status(400).json({ message: 'Código inválido' });
    }

    // Verificar se expirou
    if (new Date() > passwordReset.expiresAt) {
      return res.status(400).json({ message: 'Código expirado' });
    }

    // Buscar usuário
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Atualizar senha
    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    await user.update({ password: hashedPassword });

    // Marcar código como usado
    await passwordReset.update({ used: true });

    res.status(200).json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ message: 'Erro ao resetar senha', error: error.message });
  }
});

module.exports = router;
