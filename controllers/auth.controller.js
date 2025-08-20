// server/controllers/auth.controller.js
const db = require('../models/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth.utils');

// ลงทะเบียนผู้ใช้ใหม่
const register = async (req, res) => {
  const { 
    username, 
    email, 
    password, 
    role = 'customer',
    phone,
    address,
    shop_name,
    promptpay_id  // เพิ่มการรับค่า promptpay_id
  } = req.body;
  
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  try {
    // Hash รหัสผ่าน
    const hashedPassword = await hashPassword(password);
    
    // เตรียมข้อมูลสำหรับการบันทึกลงฐานข้อมูล
    let userData = {
      username,
      email,
      password: hashedPassword,
      role
    };

    // เพิ่มข้อมูลเพิ่มเติมตามประเภทผู้ใช้งาน
    if (phone) userData.phone = phone;
    if (address) userData.address = address;
    
    // ถ้าเป็นร้านเช่ารถ ต้องมีข้อมูลเพิ่มเติม
    if (role === 'shop') {
      if (!shop_name) {
        return res.status(400).json({ message: 'Shop name is required for shop accounts' });
      }
      userData.shop_name = shop_name;
      
      // เพิ่มการบันทึก promptpay_id สำหรับร้านเช่ารถ
      if (promptpay_id) {
        userData.promptpay_id = promptpay_id;
      }
    }
    
    // บันทึกข้อมูลผู้ใช้ลงในฐานข้อมูล
    const result = await db.create('users', userData);
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId 
    });
  } catch (err) {
    // ตรวจสอบ error duplicate entry
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// เข้าสู่ระบบ
const login = async (req, res) => {
  const { username, password } = req.body;
  
  // ตรวจสอบข้อมูลที่ส่งมา
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // ค้นหาผู้ใช้จากฐานข้อมูล
    const user = await db.findOne('users', { username }, [username]);
    
    // ตรวจสอบว่ามีผู้ใช้หรือไม่
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // เช็คสถานะผู้ใช้
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }
    
    // เปรียบเทียบรหัสผ่าน
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // สร้าง JWT token
    const token = generateToken(user);
    
    // ลบรหัสผ่านก่อนส่งข้อมูลกลับ
    delete user.password;
    
    // ส่ง token กลับไป
    res.status(200).json({
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงข้อมูลผู้ใช้ปัจจุบัน
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // ตรวจสอบว่ามีคอลัมน์ promptpay_id หรือไม่
    const [columns] = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    
    // สร้าง query ตามคอลัมน์ที่มีอยู่
    let query;
    if (columns.length > 0) {
      // ถ้ามีคอลัมน์ promptpay_id
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, promptpay_id, created_at ' +
              'FROM users WHERE id = ?';
    } else {
      // ถ้าไม่มีคอลัมน์ promptpay_id
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, created_at ' +
              'FROM users WHERE id = ?';
    }
    
    const users = await db.executeQuery(query, [userId]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fix: Ensure promptpay_id is included for all users
    if (!user.promptpay_id) {
      // Query directly to get promptpay_id if missing
      const directQuery = 'SELECT promptpay_id FROM users WHERE id = ?';
      const directResult = await db.executeQuery(directQuery, [userId]);
      if (directResult.length > 0 && directResult[0].promptpay_id) {
        user.promptpay_id = directResult[0].promptpay_id;
      }
    }
    
    res.status(200).json({
      user
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อัปเดตข้อมูลโปรไฟล์
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // ตรวจสอบว่ามีคอลัมน์ promptpay_id หรือไม่
    const [columns] = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    
    // เตรียมข้อมูลที่อนุญาตให้อัปเดต
    let allowedFields = ['phone', 'address', 'profile_image'];
    
    // เพิ่ม promptpay_id สำหรับทั้ง shop และ customer เมื่อมีคอลัมน์นี้อยู่
    if (columns.length > 0) {
      allowedFields.push('promptpay_id');
    }
    
    if (userRole === 'shop') {
      allowedFields.push('shop_name', 'shop_description');
    }
    
    // กรองเฉพาะฟิลด์ที่อนุญาตและมีค่า
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    
    // ตรวจสอบว่ามีข้อมูลที่จะอัปเดตหรือไม่
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }
    
    // อัปเดตข้อมูลผู้ใช้
    const result = await db.update('users', userId, updateData);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // สร้าง query สำหรับดึงข้อมูลผู้ใช้ล่าสุดตามคอลัมน์ที่มีอยู่
    let query;
    if (columns.length > 0) {
      // ถ้ามีคอลัมน์ promptpay_id
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, promptpay_id, created_at ' +
              'FROM users WHERE id = ?';
    } else {
      // ถ้าไม่มีคอลัมน์ promptpay_id
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, created_at ' +
              'FROM users WHERE id = ?';
    }
    
    // ดึงข้อมูลผู้ใช้ล่าสุดหลังจากอัปเดต
    const updatedUsers = await db.executeQuery(query, [userId]);
    const updatedUser = updatedUsers[0];
    
    // Fix: Ensure promptpay_id is included for all users in update response
    if (updatedUser && !updatedUser.promptpay_id) {
      const directQuery = 'SELECT promptpay_id FROM users WHERE id = ?';
      const directResult = await db.executeQuery(directQuery, [userId]);
      if (directResult.length > 0 && directResult[0].promptpay_id) {
        updatedUser.promptpay_id = directResult[0].promptpay_id;
      }
    }
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
    
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};