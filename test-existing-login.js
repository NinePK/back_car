// ทดสอบ login กับบัญชีที่มีอยู่
const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';

const testExistingLogin = async () => {
  console.log('=== ทดสอบ Login กับบัญชีที่มีอยู่ ===\n');

  // ลอง login กับ testshop2024 ที่เพิ่งสร้าง
  console.log('1. ทดสอบ login testshop2024...');
  try {
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: 'testshop2024',
      password: 'testpass123'
    });
    
    console.log('✅ Login testshop2024 สำเร็จ');
    console.log('Token:', loginResponse.data.token.substring(0, 30) + '...');
    
    return {
      username: 'testshop2024',
      token: loginResponse.data.token,
      user: loginResponse.data.user
    };
    
  } catch (error) {
    console.log('❌ Login testshop2024 ไม่สำเร็จ');
    console.log('Error:', error.response?.data || error.message);
  }

  // ลอง login กับบัญชีเดิม
  const existingAccounts = [
    { username: 'Car_shop', passwords: ['123456', 'password123', 'car_shop', 'admin'] },
    { username: 'nine', passwords: ['123456', 'password123', 'nine', 'admin'] },
    { username: 'car2', passwords: ['123456', 'password123', 'car2', 'admin'] }
  ];

  for (const account of existingAccounts) {
    console.log(`\n2. ทดสอบ login ${account.username}...`);
    
    for (const password of account.passwords) {
      try {
        const loginResponse = await axios.post(`${API_BASE}/login`, {
          username: account.username,
          password: password
        });
        
        console.log(`✅ Login ${account.username} สำเร็จด้วยรหัสผ่าน: ${password}`);
        console.log('Token:', loginResponse.data.token.substring(0, 30) + '...');
        console.log('User:', loginResponse.data.user);
        
        return {
          username: account.username,
          password: password,
          token: loginResponse.data.token,
          user: loginResponse.data.user
        };
        
      } catch (error) {
        console.log(`❌ รหัสผ่าน "${password}" ไม่ถูกต้องสำหรับ ${account.username}`);
      }
    }
  }

  return null;
};

const testAPIsWithToken = async (credentials) => {
  console.log('\n=== ทดสอบ API Endpoints ===');
  
  try {
    // ทดสอบ pending rentals
    console.log('\n1. ทดสอบ /shop/rentals/pending...');
    const pendingRentals = await axios.get(`${API_BASE}/shop/rentals/pending`, {
      headers: { Authorization: `Bearer ${credentials.token}` }
    });
    console.log('✅ API shop/rentals/pending ทำงาน');
    console.log('Rentals:', JSON.stringify(pendingRentals.data, null, 2));

    // ทดสอบ pending payments
    console.log('\n2. ทดสอบ /shop/pending-payments...');
    const pendingPayments = await axios.get(`${API_BASE}/shop/pending-payments`, {
      headers: { Authorization: `Bearer ${credentials.token}` }
    });
    console.log('✅ API shop/pending-payments ทำงาน');
    console.log('Payments:', JSON.stringify(pendingPayments.data, null, 2));

    // ทดสอบ pending bookings
    console.log('\n3. ทดสอบ /shop/bookings/pending...');
    const pendingBookings = await axios.get(`${API_BASE}/shop/bookings/pending`, {
      headers: { Authorization: `Bearer ${credentials.token}` }
    });
    console.log('✅ API shop/bookings/pending ทำงาน');
    console.log('Bookings:', JSON.stringify(pendingBookings.data, null, 2));

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ API:', error.response?.data || error.message);
  }
};

// เรียกใช้
if (require.main === module) {
  (async () => {
    const credentials = await testExistingLogin();
    
    if (credentials) {
      console.log(`\n🎉 Login สำเร็จ: ${credentials.username}`);
      if (credentials.user.role === 'shop') {
        await testAPIsWithToken(credentials);
      } else {
        console.log('❌ บัญชีนี้ไม่ใช่ shop ไม่สามารถทดสอบ API shop ได้');
      }
    } else {
      console.log('\n❌ ไม่สามารถ login ได้ด้วยบัญชีใดๆ');
    }
  })();
}