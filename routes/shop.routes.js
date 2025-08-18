// server/routes/shop.routes.js
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const carController = require('../controllers/car.controller');
const { authenticateToken, isShop } = require('../middleware');
const { upload } = require('../utils/upload.utils');

// ดึงรายการร้านเช่ารถ
router.get('/', shopController.getShops);

// ค้นหาร้านเช่ารถ
router.get('/search', shopController.searchShops);

// อัปโหลดรูปโปรไฟล์ร้าน
router.post('/upload-profile-image', authenticateToken, isShop, upload.single('profile_image'), shopController.uploadProfileImage);

// ดึงรายการรถยนต์ของร้านเช่ารถที่กำลังล็อกอิน (สำหรับหน้า dashboard)
router.get('/dashboard/cars', authenticateToken, isShop, carController.getShopCars);

// ดึงข้อมูลร้านเช่ารถตามไอดี
router.get('/:shopId', shopController.getShopById);

// ดึงรายการรถยนต์ของร้านเช่ารถตามไอดี
router.get('/:shopId/cars', carController.getShopCarsByShopId);

module.exports = router;