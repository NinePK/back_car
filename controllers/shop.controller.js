// server/controllers/shop.controller.js
const db = require('../models/db');

// ดึงรายการร้านเช่ารถ
const getShops = async (req, res) => {
  try {
    // สร้างคำสั่ง SQL เพื่อดึงร้านเช่ารถพร้อมนับจำนวนรถในร้าน
    const query = `
      SELECT u.id, u.username, u.shop_name, u.address, u.profile_image, 
             COUNT(c.id) as car_count
      FROM users u
      LEFT JOIN cars c ON u.id = c.shop_id
      WHERE u.role = 'shop' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY car_count DESC, u.created_at DESC
    `;
    
    const shops = await db.executeQuery(query);
    
    res.status(200).json({
      shops
    });
    
  } catch (err) {
    console.error('Get shops error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ค้นหาร้านเช่ารถ
const searchShops = async (req, res) => {
  try {
    let conditions = [];
    let values = [];
    let query = `
      SELECT u.id, u.username, u.shop_name, u.address, u.profile_image, 
             COUNT(c.id) as car_count
      FROM users u
      LEFT JOIN cars c ON u.id = c.shop_id
      WHERE u.role = 'shop' AND u.status = 'active'
    `;
    
    // กรองตามชื่อร้าน
    if (req.query.q) {
      conditions.push('(u.shop_name LIKE ? OR u.username LIKE ?)');
      values.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    
    // เพิ่มเงื่อนไขในคำสั่ง SQL
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    // กลุ่มตาม shop_id
    query += ' GROUP BY u.id';
    
    // จัดเรียงผลลัพธ์
    query += ' ORDER BY car_count DESC, u.created_at DESC';
    
    // จำกัดจำนวนผลลัพธ์ถ้ามีการระบุ
    if (req.query.limit) {
      query += ' LIMIT ?';
      values.push(Number(req.query.limit));
    }
    
    const shops = await db.executeQuery(query, values);
    
    res.status(200).json({
      shops
    });
    
  } catch (err) {
    console.error('Search shops error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงข้อมูลร้านเช่ารถตามไอดี
const getShopById = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    
    // ดึงข้อมูลร้านเช่ารถ
    const [shop] = await db.executeQuery(
      `SELECT id, username, shop_name, shop_description, address, phone, profile_image, created_at
       FROM users 
       WHERE id = ? AND role = 'shop' AND status = 'active'`,
      [shopId]
    );
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // ดึงรถยนต์ทั้งหมดในร้าน
    const cars = await db.executeQuery(
      `SELECT * FROM cars WHERE shop_id = ? AND status = 'available' ORDER BY created_at DESC`,
      [shopId]
    );
    
    // ดึงรูปภาพของรถยนต์แต่ละคัน
    for (const car of cars) {
      const images = await db.executeQuery(
        'SELECT * FROM car_images WHERE car_id = ?',
        [car.id]
      );
      car.images = images;
    }
    
    shop.cars = cars;
    
    res.status(200).json({
      shop
    });
    
  } catch (err) {
    console.error('Get shop error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อัปโหลดรูปโปรไฟล์ร้าน
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const userId = req.user.id;
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // อัปเดตรูปโปรไฟล์ในฐานข้อมูล
    const result = await db.update('users', userId, { profile_image: imageUrl });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      message: 'Profile image uploaded successfully',
      imageUrl
    });
    
  } catch (err) {
    console.error('Upload profile image error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getShops,
  searchShops,
  getShopById,
  uploadProfileImage
};