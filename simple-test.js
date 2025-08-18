// ทดสอบ API อย่างง่าย
const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';

const simpleTest = async () => {
  try {
    // Login Car_shop
    console.log('Login Car_shop...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: 'Car_shop',
      password: 'newpass123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login สำเร็จ');
    console.log('User ID:', user.id);
    console.log('Role:', user.role);
    
    // ตรวจสอบข้อมูลในฐานข้อมูลโดยตรง
    console.log('\nตรวจสอบข้อมูลการจองในฐานข้อมูล...');
    const db = require('./models/db');
    
    const allRentals = await db.executeQuery('SELECT * FROM rentals');
    console.log('Rentals ทั้งหมด:', allRentals);
    
    const shopRentals = await db.executeQuery('SELECT * FROM rentals WHERE shop_id = ?', [user.id]);
    console.log(`Rentals ของ shop ${user.id}:`, shopRentals);
    
    // ลองเรียก API โดยตรง
    console.log('\nเรียก API pending rentals...');
    const response = await axios.get(`${API_BASE}/shop/rentals/pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ API ตอบกลับ:', response.data);
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
};

simpleTest();