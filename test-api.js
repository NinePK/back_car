// ทดสอบ API endpoints สำหรับตรวจสอบระบบแจ้งเตือน
const axios = require('axios');
const bcrypt = require('bcrypt');

const API_BASE = 'http://localhost:8000/api';

const testAPI = async () => {
  try {
    console.log('=== ทดสอบ API Endpoints ===\n');

    // 1. ทดสอบ login shop
    console.log('1. ทดสอบ login shop...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: 'ninefpro@gmail.com',
      password: '123456'
    });
    
    const shopToken = loginResponse.data.token;
    console.log('✅ Login shop สำเร็จ');
    console.log('Token:', shopToken.substring(0, 20) + '...\n');

    // 2. ทดสอบ API pending rentals
    console.log('2. ทดสอบ API shop/rentals/pending...');
    try {
      const pendingRentalsResponse = await axios.get(`${API_BASE}/shop/rentals/pending`, {
        headers: {
          Authorization: `Bearer ${shopToken}`
        }
      });
      console.log('✅ API pending rentals ทำงาน');
      console.log('ข้อมูล:', JSON.stringify(pendingRentalsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ API pending rentals มีปัญหา');
      console.log('Error:', error.response?.data || error.message);
    }

    console.log('\n3. ทดสอบ API shop/pending-payments...');
    try {
      const pendingPaymentsResponse = await axios.get(`${API_BASE}/shop/pending-payments`, {
        headers: {
          Authorization: `Bearer ${shopToken}`
        }
      });
      console.log('✅ API pending payments ทำงาน');
      console.log('ข้อมูล:', JSON.stringify(pendingPaymentsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ API pending payments มีปัญหา');
      console.log('Error:', error.response?.data || error.message);
    }

    console.log('\n4. ทดสอบ API shop/bookings/pending...');
    try {
      const pendingBookingsResponse = await axios.get(`${API_BASE}/shop/bookings/pending`, {
        headers: {
          Authorization: `Bearer ${shopToken}`
        }
      });
      console.log('✅ API pending bookings ทำงาน');
      console.log('ข้อมูล:', JSON.stringify(pendingBookingsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ API pending bookings มีปัญหา');
      console.log('Error:', error.response?.data || error.message);
    }

    // 5. ทดสอบกับ shop อื่น (ID 3)
    console.log('\n5. ทดสอบ login shop อื่น (ID 3)...');
    try {
      const loginResponse2 = await axios.post(`${API_BASE}/login`, {
        email: 'carrr@gmail.com',
        password: '123456'
      });
      
      const shopToken2 = loginResponse2.data.token;
      console.log('✅ Login shop 2 สำเร็จ');

      const pendingBookingsResponse2 = await axios.get(`${API_BASE}/shop/bookings/pending`, {
        headers: {
          Authorization: `Bearer ${shopToken2}`
        }
      });
      console.log('✅ API pending bookings shop 2 ทำงาน');
      console.log('ข้อมูล:', JSON.stringify(pendingBookingsResponse2.data, null, 2));
    } catch (error) {
      console.log('❌ มีปัญหากับ shop 2');
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการทดสอบ API:', error.response?.data || error.message);
  }
};

// ทดสอบการเข้าสู่ระบบด้วยรหัสผ่านต่างๆ
const testLogin = async () => {
  console.log('\n=== ทดสอบการเข้าสู่ระบบ ===');
  
  const passwords = ['123456', 'password123', '12345678'];
  const emails = ['ninefpro@gmail.com', 'carrr@gmail.com'];
  
  for (const email of emails) {
    console.log(`\nทดสอบ email: ${email}`);
    for (const password of passwords) {
      try {
        const response = await axios.post(`${API_BASE}/login`, {
          email,
          password
        });
        console.log(`✅ รหัสผ่าน "${password}" ถูกต้อง`);
        return { email, password, token: response.data.token };
      } catch (error) {
        console.log(`❌ รหัสผ่าน "${password}" ไม่ถูกต้อง`);
      }
    }
  }
  
  return null;
};

// เรียกใช้ฟังก์ชัน
if (require.main === module) {
  (async () => {
    const loginSuccess = await testLogin();
    
    if (loginSuccess) {
      console.log(`\n🎉 พบรหัสผ่านที่ถูกต้อง: ${loginSuccess.email} / ${loginSuccess.password}`);
      await testAPI();
    } else {
      console.log('\n❌ ไม่สามารถเข้าสู่ระบบได้ด้วยรหัสผ่านใดๆ');
    }
  })();
}