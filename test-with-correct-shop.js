// ทดสอบกับ shop ที่มีข้อมูลการจองจริง
const axios = require('axios');
const bcrypt = require('bcrypt');

const API_BASE = 'http://localhost:8000/api';

const resetShopPassword = async () => {
  const db = require('./models/db');
  
  try {
    console.log('กำลัง reset รหัสผ่าน shop ที่มีอยู่...');
    
    const hashedPassword = await bcrypt.hash('newpass123', 10);
    
    // Update password สำหรับ shop id 1 (Car_shop)
    await db.update('users', 1, { password: hashedPassword });
    console.log('✅ Update รหัสผ่าน shop ID 1 (Car_shop) เป็น: newpass123');
    
    // Update password สำหรับ shop id 3 (car2) 
    await db.update('users', 3, { password: hashedPassword });
    console.log('✅ Update รหัสผ่าน shop ID 3 (car2) เป็น: newpass123');
    
    return true;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการ reset รหัสผ่าน:', error);
    return false;
  }
};

const testWithCorrectShop = async () => {
  try {
    console.log('\n=== ทดสอบกับ Shop ที่มีข้อมูลการจองจริง ===\n');

    // ทดสอบ shop ID 1 (Car_shop)
    console.log('1. ทดสอบ login Car_shop (shop_id: 1)...');
    const loginResponse1 = await axios.post(`${API_BASE}/login`, {
      username: 'Car_shop',
      password: 'newpass123'
    });
    
    console.log('✅ Login Car_shop สำเร็จ');
    const token1 = loginResponse1.data.token;
    
    // ทดสอบ API กับ shop ID 1
    console.log('\nทดสอบ API กับ Car_shop:');
    
    console.log('- shop/rentals/pending:');
    const pendingRentals1 = await axios.get(`${API_BASE}/shop/rentals/pending`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(JSON.stringify(pendingRentals1.data, null, 2));
    
    console.log('- shop/pending-payments:');
    const pendingPayments1 = await axios.get(`${API_BASE}/shop/pending-payments`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(JSON.stringify(pendingPayments1.data, null, 2));
    
    console.log('- shop/bookings/pending:');
    const pendingBookings1 = await axios.get(`${API_BASE}/shop/bookings/pending`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(JSON.stringify(pendingBookings1.data, null, 2));

    console.log('\n' + '='.repeat(50));

    // ทดสอบ shop ID 3 (car2)
    console.log('\n2. ทดสอบ login car2 (shop_id: 3)...');
    const loginResponse3 = await axios.post(`${API_BASE}/login`, {
      username: 'car2',
      password: 'newpass123'
    });
    
    console.log('✅ Login car2 สำเร็จ');
    const token3 = loginResponse3.data.token;
    
    // ทดสอบ API กับ shop ID 3
    console.log('\nทดสอบ API กับ car2:');
    
    console.log('- shop/rentals/pending:');
    const pendingRentals3 = await axios.get(`${API_BASE}/shop/rentals/pending`, {
      headers: { Authorization: `Bearer ${token3}` }
    });
    console.log(JSON.stringify(pendingRentals3.data, null, 2));
    
    console.log('- shop/pending-payments:');
    const pendingPayments3 = await axios.get(`${API_BASE}/shop/pending-payments`, {
      headers: { Authorization: `Bearer ${token3}` }
    });
    console.log(JSON.stringify(pendingPayments3.data, null, 2));
    
    console.log('- shop/bookings/pending:');
    const pendingBookings3 = await axios.get(`${API_BASE}/shop/bookings/pending`, {
      headers: { Authorization: `Bearer ${token3}` }
    });
    console.log(JSON.stringify(pendingBookings3.data, null, 2));

    console.log('\n🎉 การทดสอบเสร็จสิ้น!');
    console.log('ข้อมูลการเข้าสู่ระบบที่ใช้งานได้:');
    console.log('- Car_shop: Car_shop / newpass123');
    console.log('- car2: car2 / newpass123');

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการทดสอบ:', error.response?.data || error.message);
  }
};

// เรียกใช้
if (require.main === module) {
  (async () => {
    const resetSuccess = await resetShopPassword();
    if (resetSuccess) {
      await testWithCorrectShop();
    }
  })();
}