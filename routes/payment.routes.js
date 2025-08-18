// server/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, isShop, isCustomer } = require('../middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// กำหนด storage สำหรับการอัปโหลดหลักฐานการชำระเงิน
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/payments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'payment-' + uniqueSuffix + ext);
  }
});

// กำหนด filter สำหรับชนิดไฟล์ที่อนุญาต
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and JPG are allowed.'));
  }
};

// สร้าง multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาดไฟล์ 5MB
  fileFilter: fileFilter
});

// === สำหรับลูกค้า ===

// ดึงข้อมูลสำหรับการชำระเงิน
router.get('/customer/payments/:rentalId', authenticateToken, isCustomer, paymentController.getPaymentInfo);

// อัปโหลดหลักฐานการชำระเงิน
router.post(
  '/customer/payments/:rentalId/proof',
  authenticateToken,
  isCustomer,
  upload.single('payment_proof'),
  paymentController.uploadPaymentProof
);

// สร้าง QR Code PromptPay
router.get('/customer/payments/:rentalId/qr', authenticateToken, isCustomer, paymentController.generatePromptPayQR);

// === สำหรับร้านเช่ารถ ===

// ยืนยันการชำระเงิน
router.post('/shop/payments/:rentalId/verify', authenticateToken, isShop, paymentController.verifyPayment);

// ดึงข้อมูลการชำระเงินที่รอการยืนยัน
router.get('/shop/pending-payments', authenticateToken, isShop, paymentController.getPendingPayments);

// ดึงประวัติการชำระเงิน
router.get('/shop/payment-history', authenticateToken, isShop, paymentController.getPaymentHistory);

module.exports = router;