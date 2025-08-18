// server/routes/image.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, isShop } = require('../middleware'); // ใช้ middleware ที่มีอยู่
const { upload } = require('../middlewares/upload.middleware');
const imageController = require('../controllers/image.controller');

// อัปโหลดรูปภาพรถยนต์ (ต้องเป็นร้านเช่ารถเท่านั้น)
router.post(
  '/cars/:carId/images',
  authenticateToken, // ตรวจสอบการเข้าสู่ระบบ
  isShop, // ตรวจสอบว่าเป็นร้านเช่ารถ
  upload.array('car_images', 10), // รับไฟล์ได้สูงสุด 10 ไฟล์
  imageController.uploadCarImages
);

// ลบรูปภาพรถยนต์ (ต้องเป็นร้านเช่ารถเท่านั้น)
router.delete(
  '/cars/:carId/images/:imageId',
  authenticateToken,
  isShop,
  imageController.deleteCarImage
);

// กำหนดรูปหลัก (ต้องเป็นร้านเช่ารถเท่านั้น)
router.put(
  '/cars/:carId/images/:imageId/primary',
  authenticateToken,
  isShop,
  imageController.setPrimaryImage
);

module.exports = router;