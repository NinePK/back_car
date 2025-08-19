// server/routes/car.routes.js
const express = require('express');
const router = express.Router();
const carController = require('../controllers/car.controller');
const { authenticateToken, isShop } = require('../middleware');

// สำหรับ shop dashboard - ดึงรายการรถของร้านที่กำลังล็อกอิน
router.get('/shop/dashboard', authenticateToken, isShop, carController.getShopCars);

// ดึงรถยนต์แนะนำ (featured cars)
router.get('/featured', carController.getFeaturedCars);

// สร้างรถใหม่
router.post('/', authenticateToken, isShop, carController.addCar);

// ค้นหารถยนต์
router.get('/', carController.searchCars);

// ดึงข้อมูลรถยนต์ตามไอดี
router.get('/:carId', carController.getCarById);

// ดึงข้อมูลรถยนต์สำหรับลูกค้า (ต้องการ authentication)
router.get('/:carId/customer', authenticateToken, carController.getCarForCustomer);

// อัปเดตข้อมูลรถยนต์
router.put('/:carId', authenticateToken, isShop, carController.updateCar);

// อัปเดตสถานะรถยนต์
router.put('/:carId/status', authenticateToken, isShop, carController.updateCarStatus);

// ลบรถยนต์
router.delete('/:carId', authenticateToken, isShop, carController.deleteCar);

module.exports = router;