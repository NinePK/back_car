// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware');

// ลงทะเบียนผู้ใช้ใหม่
router.post('/register', authController.register);

// เข้าสู่ระบบ
router.post('/login', authController.login);

// ดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', authenticateToken, authController.getProfile);

// อัปเดตข้อมูลโปรไฟล์
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;