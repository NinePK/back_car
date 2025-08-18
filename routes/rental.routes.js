// server/routes/rental.routes.js
const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rental.controller');
const { authenticateToken, isShop, isCustomer } = require('../middleware');

// === สำหรับลูกค้า ===

// สร้างคำขอเช่ารถ
router.post('/customer/cars/:carId/book', authenticateToken, isCustomer, rentalController.createRental);

// ดึงรายการเช่ารถของลูกค้า
router.get('/customer/rentals', authenticateToken, isCustomer, rentalController.getCustomerRentals);

// ดึงรายละเอียดการเช่ารถ
router.get('/customer/rentals/:rentalId', authenticateToken, isCustomer, rentalController.getRentalDetails);

// ยกเลิกการจองรถ
router.post('/customer/rentals/:rentalId/cancel', authenticateToken, isCustomer, rentalController.cancelRental);

// ขอคืนรถ
router.post('/customer/rentals/:rentalId/return', authenticateToken, isCustomer, rentalController.requestCarReturn);

// === สำหรับร้านเช่ารถ ===

// ดึงรายการเช่ารถของร้านเช่ารถ
router.get('/shop/rentals', authenticateToken, isShop, rentalController.getShopRentals);

// ดึงรายละเอียดการจองสำหรับร้านเช่ารถ
router.get('/shop/rentals/:rentalId', authenticateToken, isShop, rentalController.getShopRentalDetails);

// อัปเดตสถานะการเช่ารถ
router.put('/shop/rentals/:rentalId/status', authenticateToken, isShop, rentalController.updateRentalStatus);

// ดึงรายการจองที่รออนุมัติ - ย้ายมาไว้ก่อน route ที่มี parameter
router.get('/shop/rentals/pending', authenticateToken, isShop, rentalController.getPendingRentals);
router.get('/shop/bookings/pending', authenticateToken, isShop, rentalController.getPendingBookings);

// อนุมัติหรือปฏิเสธการจอง - ย้ายไว้หลัง
router.post('/shop/rentals/:rentalId/approve', authenticateToken, isShop, rentalController.approveRental);

// อนุมัติหรือปฏิเสธการจองและการชำระเงิน
router.post('/shop/bookings/:id/approve', authenticateToken, isShop, rentalController.approveBooking);

// ดึงรายการขอคืนรถ
router.get('/shop/returns', authenticateToken, isShop, rentalController.getReturnRequests);

// อนุมัติการคืนรถ
router.post('/shop/rentals/:rentalId/approve-return', authenticateToken, isShop, rentalController.approveCarReturn);

module.exports = router;