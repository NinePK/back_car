// server/utils/auth.utils.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { config } = require('../config');

// Hash รหัสผ่าน
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// เปรียบเทียบรหัสผ่าน
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// สร้าง JWT token
const generateToken = (userData) => {
  return jwt.sign(
    { 
      id: userData.id, 
      username: userData.username, 
      email: userData.email,
      role: userData.role
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken
};