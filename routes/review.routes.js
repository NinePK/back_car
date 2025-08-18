// server/routes/review.routes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticateToken, isCustomer } = require('../middleware');

// สร้างรีวิวใหม่ (ลูกค้าเท่านั้น)
router.post('/reviews', authenticateToken, isCustomer, reviewController.createReview);

// ดึงการเช่าที่สามารถรีวิวได้ (ลูกค้าเท่านั้น)
router.get('/reviews/reviewable-rentals', authenticateToken, isCustomer, reviewController.getReviewableRentals);

// ดึงรีวิวของลูกค้า (ลูกค้าเท่านั้น)
router.get('/reviews/my-reviews', authenticateToken, isCustomer, reviewController.getCustomerReviews);

// ดึงรีวิวของรถยนต์ (สำหรับทุกคน)
router.get('/reviews/car/:carId', reviewController.getCarReviews);

// ดึงรีวิวของร้าน (สำหรับทุกคน)
router.get('/reviews/shop/:shopId', reviewController.getShopReviews);

// แก้ไขรีวิว (ลูกค้าเท่านั้น)
router.put('/reviews/:reviewId', authenticateToken, isCustomer, reviewController.updateReview);

// ลบรีวิว (ลูกค้าเท่านั้น)
router.delete('/reviews/:reviewId', authenticateToken, isCustomer, reviewController.deleteReview);

module.exports = router;