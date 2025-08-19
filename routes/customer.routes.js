// back/routes/customer.routes.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateToken, isCustomer } = require('../middleware');

// ข้อมูลโปรไฟล์ลูกค้า
router.get('/profile', authenticateToken, isCustomer, customerController.getProfile);
router.put('/profile', authenticateToken, isCustomer, customerController.updateProfile);

// สถิติการใช้งานลูกค้า
router.get('/stats', authenticateToken, isCustomer, customerController.getStats);

// การจองของลูกค้า
router.get('/rentals', authenticateToken, isCustomer, customerController.getRentals);
router.post('/rentals/:id/cancel', authenticateToken, isCustomer, customerController.cancelRental);
router.post('/rentals/:id/return', authenticateToken, isCustomer, customerController.requestReturn);

// รายละเอียดรถที่ลูกค้าจอง
router.get('/cars/:id', authenticateToken, isCustomer, customerController.getCarDetails);

module.exports = router;
