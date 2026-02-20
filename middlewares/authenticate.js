const jwt = require('jsonwebtoken');
const config = require('../config/environment');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(403).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'INVALID_TOKEN' });
    }

    req.userId = decoded.id;
    next();
  });
};

module.exports = authenticate;
