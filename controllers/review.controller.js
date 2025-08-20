// server/controllers/review.controller.js
const db = require('../models/db');

// สร้างรีวิวใหม่
const createReview = async (req, res) => {
  try {
    const { rental_id, rating, comment } = req.body;
    const customer_id = req.user.id;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!rental_id || !rating) {
      return res.status(400).json({ message: 'กรุณากรอกรายละเอียดที่จำเป็น (rental_id และ rating)' });
    }
    
    // ตรวจสอบว่า rating อยู่ในช่วง 1-5
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'คะแนนต้องอยู่ระหว่าง 1-5 ดาว' });
    }
    
    // ตรวจสอบว่าการเช่านี้มีอยู่จริงและสำเร็จแล้วหรือได้รับการอนุมัติคืนรถแล้ว
    const [rental] = await db.executeQuery(
      `SELECT r.*, c.shop_id, c.id as car_id
       FROM rentals r 
       JOIN cars c ON r.car_id = c.id 
       WHERE r.id = ? AND r.customer_id = ? 
       AND r.rental_status IN ('completed', 'return_approved')`,
      [rental_id, customer_id]
    );
    
    if (!rental) {
      return res.status(404).json({ 
        message: 'ไม่พบการเช่านี้หรือการเช่ายังไม่เสร็จสิ้น/อนุมัติคืนรถ' 
      });
    }
    
    // ตรวจสอบว่าได้ทำการรีวิวแล้วหรือยัง
    const [existingReview] = await db.executeQuery(
      'SELECT id FROM reviews WHERE rental_id = ? AND customer_id = ?',
      [rental_id, customer_id]
    );
    
    if (existingReview) {
      return res.status(409).json({ 
        message: 'คุณได้ทำการรีวิวการเช่านี้แล้ว' 
      });
    }
    
    // สร้างรีวิวใหม่
    const result = await db.create('reviews', {
      rental_id,
      customer_id,
      shop_id: rental.shop_id,
      car_id: rental.car_id,
      rating: parseInt(rating),
      comment: comment || null
    });
    
    res.status(201).json({
      message: 'สร้างรีวิวสำเร็จ',
      reviewId: result.insertId
    });
    
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างรีวิว' });
  }
};

// ดึงรีวิวของรถยนต์
const getCarReviews = async (req, res) => {
  try {
    const carId = req.params.carId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // ดึงรีวิวทั้งหมดของรถยนต์
    const reviews = await db.executeQuery(
      `SELECT r.*, u.username, u.profile_image,
              CONCAT(c.brand, ' ', c.model) as car_name
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       JOIN cars c ON r.car_id = c.id
       WHERE r.car_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [carId, limit, offset]
    );
    
    // นับจำนวนรีวิวทั้งหมด
    const [countResult] = await db.executeQuery(
      'SELECT COUNT(*) as total FROM reviews WHERE car_id = ?',
      [carId]
    );
    
    // คำนวณค่าเฉลี่ยคะแนน
    const [avgResult] = await db.executeQuery(
      'SELECT AVG(rating) as average_rating, COUNT(*) as review_count FROM reviews WHERE car_id = ?',
      [carId]
    );
    
    res.status(200).json({
      reviews,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      },
      statistics: {
        averageRating: parseFloat(avgResult.average_rating || 0).toFixed(1),
        reviewCount: avgResult.review_count || 0
      }
    });
    
  } catch (err) {
    console.error('Get car reviews error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรีวิว' });
  }
};

// ดึงรีวิวของร้าน
const getShopReviews = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // ดึงรีวิวทั้งหมดของร้าน
    const reviews = await db.executeQuery(
      `SELECT r.*, u.username, u.profile_image,
              CONCAT(c.brand, ' ', c.model) as car_name
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       JOIN cars c ON r.car_id = c.id
       WHERE r.shop_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [shopId, limit, offset]
    );
    
    // นับจำนวนรีวิวทั้งหมด
    const [countResult] = await db.executeQuery(
      'SELECT COUNT(*) as total FROM reviews WHERE shop_id = ?',
      [shopId]
    );
    
    // คำนวณค่าเฉลี่ยคะแนน
    const [avgResult] = await db.executeQuery(
      'SELECT AVG(rating) as average_rating, COUNT(*) as review_count FROM reviews WHERE shop_id = ?',
      [shopId]
    );
    
    res.status(200).json({
      reviews,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      },
      statistics: {
        averageRating: parseFloat(avgResult.average_rating || 0).toFixed(1),
        reviewCount: avgResult.review_count || 0
      }
    });
    
  } catch (err) {
    console.error('Get shop reviews error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรีวิว' });
  }
};

// ดึงรีวิวของลูกค้า
const getCustomerReviews = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // ดึงรีวิวทั้งหมดของลูกค้า
    const reviews = await db.executeQuery(
      `SELECT r.*, 
              CONCAT(c.brand, ' ', c.model) as car_name,
              u.shop_name,
              rent.start_date,
              rent.end_date
       FROM reviews r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.shop_id = u.id
       JOIN rentals rent ON r.rental_id = rent.id
       WHERE r.customer_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [customer_id, limit, offset]
    );
    
    // นับจำนวนรีวิวทั้งหมด
    const [countResult] = await db.executeQuery(
      'SELECT COUNT(*) as total FROM reviews WHERE customer_id = ?',
      [customer_id]
    );
    
    res.status(200).json({
      reviews,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
    
  } catch (err) {
    console.error('Get customer reviews error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรีวิว' });
  }
};

// ดึงการเช่าที่สามารถรีวิวได้
const getReviewableRentals = async (req, res) => {
  try {
    const customer_id = req.user.id;
    
    // ดึงการเช่าที่เสร็จสิ้นแล้วหรือได้รับการอนุมัติคืนรถแล้ว และยังไม่ได้รีวิว
    const rentals = await db.executeQuery(
      `SELECT r.id as rental_id, r.start_date, r.end_date, r.rental_status,
              CONCAT(c.brand, ' ', c.model) as car_name,
              c.id as car_id,
              u.shop_name,
              u.id as shop_id
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.shop_id = u.id
       LEFT JOIN reviews rev ON r.id = rev.rental_id
       WHERE r.customer_id = ? 
       AND r.rental_status IN ('completed', 'return_approved')
       AND rev.id IS NULL
       ORDER BY r.end_date DESC`,
      [customer_id]
    );
    
    res.status(200).json({
      rentals
    });
    
  } catch (err) {
    console.error('Get reviewable rentals error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเช่า' });
  }
};

// แก้ไขรีวิว
const updateReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const customer_id = req.user.id;
    const { rating, comment } = req.body;
    
    // ตรวจสอบว่า rating อยู่ในช่วง 1-5
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'คะแนนต้องอยู่ระหว่าง 1-5 ดาว' });
    }
    
    // ตรวจสอบว่าเป็นเจ้าของรีวิวหรือไม่
    const [review] = await db.executeQuery(
      'SELECT id FROM reviews WHERE id = ? AND customer_id = ?',
      [reviewId, customer_id]
    );
    
    if (!review) {
      return res.status(404).json({ 
        message: 'ไม่พบรีวิวนี้หรือคุณไม่มีสิทธิ์แก้ไข' 
      });
    }
    
    // เตรียมข้อมูลที่จะอัปเดต
    const updateData = {};
    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (comment !== undefined) updateData.comment = comment;
    
    // ตรวจสอบว่ามีข้อมูลที่จะอัปเดตหรือไม่
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะอัปเดต' });
    }
    
    // อัปเดตรีวิว
    const result = await db.update('reviews', reviewId, updateData);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบรีวิวนี้' });
    }
    
    res.status(200).json({
      message: 'อัปเดตรีวิวสำเร็จ'
    });
    
  } catch (err) {
    console.error('Update review error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตรีวิว' });
  }
};

// ลบรีวิว
const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const customer_id = req.user.id;
    
    // ตรวจสอบว่าเป็นเจ้าของรีวิวหรือไม่
    const [review] = await db.executeQuery(
      'SELECT id FROM reviews WHERE id = ? AND customer_id = ?',
      [reviewId, customer_id]
    );
    
    if (!review) {
      return res.status(404).json({ 
        message: 'ไม่พบรีวิวนี้หรือคุณไม่มีสิทธิ์ลบ' 
      });
    }
    
    // ลบรีวิว
    const result = await db.remove('reviews', reviewId);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบรีวิวนี้' });
    }
    
    res.status(200).json({
      message: 'ลบรีวิวสำเร็จ'
    });
    
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรีวิว' });
  }
};

module.exports = {
  createReview,
  getCarReviews,
  getShopReviews,
  getCustomerReviews,
  getReviewableRentals,
  updateReview,
  deleteReview
};