// server/middleware.js
const jwt = require('jsonwebtoken');
const { config } = require('./config');

// Middleware สำหรับตรวจสอบ token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware สำหรับตรวจสอบว่าเป็นร้านเช่ารถ
const isShop = (req, res, next) => {
  if (req.user.role !== 'shop') {
    return res.status(403).json({ message: 'Access denied. Shop role required.' });
  }
  next();
};

// Middleware สำหรับตรวจสอบว่าเป็นลูกค้า
const isCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Access denied. Customer role required.' });
  }
  next();
};

module.exports = {
  authenticateToken,
  isShop,
  isCustomer
};