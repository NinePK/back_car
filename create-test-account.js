// สร้างบัญชีทดสอบใหม่
const bcrypt = require('bcrypt');
const db = require('./models/db');
const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';

const createTestAccount = async () => {
  try {
    console.log('สร้างบัญชี shop ทดสอบ...');

    // ลงทะเบียน shop ใหม่
    const registerResponse = await axios.post(`${API_BASE}/register`, {
      username: 'testshop2024',
      email: 'testshop2024@gmail.com',
      password: 'testpass123',
      role: 'shop',
      phone: '0800000000',
      shop_name: 'ร้านทดสอบระบบ 2024',
      shop_description: 'ร้านสำหรับทดสอบระบบแจ้งเตือน',
      promptpay_id: '0800000000'
    });

    console.log('✅ สร้างบัญชี shop สำเร็จ');
    console.log('Response:', registerResponse.data);

    // ลงทะเบียน customer ใหม่  
    const customerResponse = await axios.post(`${API_BASE}/register`, {
      username: 'testcustomer2024',
      email: 'testcustomer2024@gmail.com',
      password: 'testpass123',
      role: 'customer',
      phone: '0900000000'
    });

    console.log('✅ สร้างบัญชี customer สำเร็จ');
    console.log('Response:', customerResponse.data);

    // ทดสอบ login
    console.log('\nทดสอบ login...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: 'testshop2024',
      password: 'testpass123'
    });

    console.log('✅ Login สำเร็จ');
    console.log('Token:', loginResponse.data.token.substring(0, 30) + '...');

    return {
      shopEmail: 'testshop2024@gmail.com',
      customerEmail: 'testcustomer2024@gmail.com',
      password: 'testpass123',
      token: loginResponse.data.token
    };

  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.response?.data || error.message);
    return null;
  }
};

const testAPIsWithNewAccount = async (credentials) => {
  try {
    console.log('\n=== ทดสอบ API ด้วยบัญชีใหม่ ===');

    // ทดสอบ pending rentals
    console.log('1. ทดสอบ shop/rentals/pending...');
    const pendingRentals = await axios.get(`${API_BASE}/shop/rentals/pending`, {
      headers: { Authorization: `Bearer ${credentials.token}` }
    });
    console.log('ผลลัพธ์:', pendingRentals.data);

    // ทดสอบ pending payments
    console.log('\n2. ทดสอบ shop/pending-payments...');
    const pendingPayments = await axios.get(`${API_BASE}/shop/pending-payments`, {
      headers: { Authorization: `Bearer ${credentials.token}` }
    });
    console.log('ผลลัพธ์:', pendingPayments.data);

    // ทดสอบ pending bookings
    console.log('\n3. ทดสอบ shop/bookings/pending...');
    const pendingBookings = await axios.get(`${API_BASE}/shop/bookings/pending`, {
      headers: { Authorization: `Bearer ${credentials.token}` }
    });
    console.log('ผลลัพธ์:', pendingBookings.data);

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการทดสอบ API:', error.response?.data || error.message);
  }
};

// เรียกใช้
if (require.main === module) {
  (async () => {
    const credentials = await createTestAccount();
    if (credentials) {
      await testAPIsWithNewAccount(credentials);
      
      console.log('\n🎉 ข้อมูลการเข้าสู่ระบบสำหรับทดสอบ:');
      console.log(`Shop: ${credentials.shopEmail} / ${credentials.password}`);
      console.log(`Customer: ${credentials.customerEmail} / ${credentials.password}`);
    }
  })();
}