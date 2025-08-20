// back/controllers/customer.controller.js
const db = require('../models/db');

// ดึงข้อมูลโปรไฟล์ลูกค้า
const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const userId = req.user.id;
    
    const users = await db.executeQuery(
      'SELECT id, username, email, phone, address, profile_image, promptpay_id, created_at, role FROM users WHERE id = ?',
      [userId]
    );
    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Fix: Ensure promptpay_id is included for all users
    if (!user.promptpay_id) {
      const directQuery = 'SELECT promptpay_id FROM users WHERE id = ?';
      const directResult = await db.executeQuery(directQuery, [userId]);
      if (directResult.length > 0 && directResult[0].promptpay_id) {
        user.promptpay_id = directResult[0].promptpay_id;
      }
    }
    
    res.status(200).json({
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        promptpay_id: user.promptpay_id,
        profile_image: user.profile_image,
        created_at: user.created_at,
        role: user.role
      }
    });
    
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อัปเดตข้อมูลโปรไฟล์ลูกค้า
const updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const userId = req.user.id;
    const { phone, address, promptpay_id } = req.body;
    
    // ตรวจสอบว่าข้อมูลที่ส่งมาถูกต้อง
    if (!phone && !address && !promptpay_id) {
      return res.status(400).json({ message: 'Please provide phone, address, or promptpay_id to update' });
    }
    
    // สร้าง query สำหรับอัปเดต
    let updateFields = [];
    let updateValues = [];
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    
    if (promptpay_id !== undefined) {
      updateFields.push('promptpay_id = ?');
      updateValues.push(promptpay_id);
    }
    
    updateValues.push(userId);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await db.executeQuery(query, updateValues);
    
    res.status(200).json({ message: 'Profile updated successfully' });
    
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงสถิติการใช้งานลูกค้า
const getStats = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const userId = req.user.id;
    
    // นับจำนวนการจองทั้งหมด
    const totalBookings = await db.executeQuery(
      'SELECT COUNT(*) as total FROM rentals WHERE customer_id = ?',
      [userId]
    );
    
    // นับจำนวนการจองที่กำลังใช้งาน
    const activeBookings = await db.executeQuery(
      'SELECT COUNT(*) as active FROM rentals WHERE customer_id = ? AND rental_status IN (?, ?, ?)',
      [userId, 'confirmed', 'ongoing', 'return_requested']
    );
    
    // นับจำนวนการจองที่เสร็จสิ้น
    const completedBookings = await db.executeQuery(
      'SELECT COUNT(*) as completed FROM rentals WHERE customer_id = ? AND rental_status IN (?, ?, ?)',
      [userId, 'completed', 'cancelled', 'return_approved']
    );
    
    // คำนวณยอดใช้จ่ายรวม
    const totalSpent = await db.executeQuery(
      'SELECT COALESCE(SUM(total_amount), 0) as total_spent FROM rentals WHERE customer_id = ? AND payment_status = ?',
      [userId, 'paid']
    );
    
    res.status(200).json({
      stats: {
        total_bookings: totalBookings[0]?.total || 0,
        active_bookings: activeBookings[0]?.active || 0,
        completed_bookings: completedBookings[0]?.completed || 0,
        total_spent: parseFloat(totalSpent[0]?.total_spent || 0)
      }
    });
    
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงรายการการจองของลูกค้า
const getRentals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [rentals] = await db.executeQuery(`
      SELECT 
        r.*,
        c.brand,
        c.model,
        c.year,
        c.image_url,
        u.shop_name
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      JOIN users u ON r.shop_id = u.id
      WHERE r.customer_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);
    
    res.status(200).json({ rentals });
    
  } catch (err) {
    console.error('Get rentals error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ยกเลิกการจอง
const cancelRental = async (req, res) => {
  try {
    const userId = req.user.id;
    const rentalId = req.params.id;
    
    // ตรวจสอบว่าการจองเป็นของผู้ใช้นี้จริงหรือไม่
    const [rentals] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND customer_id = ?',
      [rentalId, userId]
    );
    
    if (rentals.length === 0) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    
    const rental = rentals[0];
    
    // ตรวจสอบว่าสามารถยกเลิกได้หรือไม่
    if (rental.rental_status !== 'pending' || rental.payment_status === 'paid') {
      return res.status(400).json({ message: 'Cannot cancel this rental' });
    }
    
    // อัปเดตสถานะการจอง
    await db.executeQuery(
      'UPDATE rentals SET rental_status = ? WHERE id = ?',
      ['cancelled', rentalId]
    );
    
    // อัปเดตสถานะรถให้กลับเป็น available
    await db.executeQuery(
      'UPDATE cars SET status = ? WHERE id = ?',
      ['available', rental.car_id]
    );
    
    res.status(200).json({ message: 'Rental cancelled successfully' });
    
  } catch (err) {
    console.error('Cancel rental error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ขอคืนรถ
const requestReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const rentalId = req.params.id;
    
    // ตรวจสอบว่าการจองเป็นของผู้ใช้นี้จริงหรือไม่
    const [rentals] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND customer_id = ?',
      [rentalId, userId]
    );
    
    if (rentals.length === 0) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    
    const rental = rentals[0];
    
    // ตรวจสอบว่าสามารถขอคืนรถได้หรือไม่
    if (!['confirmed', 'ongoing'].includes(rental.rental_status) || rental.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Cannot request return for this rental' });
    }
    
    // อัปเดตสถานะการจอง
    await db.executeQuery(
      'UPDATE rentals SET rental_status = ? WHERE id = ?',
      ['return_requested', rentalId]
    );
    
    res.status(200).json({ message: 'Return request submitted successfully' });
    
  } catch (err) {
    console.error('Request return error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงรายละเอียดรถ
const getCarDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const carId = req.params.id;
    
    // ตรวจสอบว่าผู้ใช้เคยจองรถคันนี้หรือไม่
    const [rentals] = await db.executeQuery(
      'SELECT * FROM rentals WHERE car_id = ? AND customer_id = ?',
      [carId, userId]
    );
    
    if (rentals.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // ดึงข้อมูลรถ
    const [cars] = await db.executeQuery(`
      SELECT 
        c.*,
        u.shop_name,
        u.phone as shop_phone,
        u.address as shop_address
      FROM cars c
      JOIN users u ON c.shop_id = u.id
      WHERE c.id = ?
    `, [carId]);
    
    if (cars.length === 0) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    // ดึงรูปภาพรถ
    const [images] = await db.executeQuery(
      'SELECT * FROM car_images WHERE car_id = ? ORDER BY is_primary DESC, id ASC',
      [carId]
    );
    
    const car = cars[0];
    car.images = images;
    
    res.status(200).json({ car });
    
  } catch (err) {
    console.error('Get car details error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getStats,
  getRentals,
  cancelRental,
  requestReturn,
  getCarDetails
};
