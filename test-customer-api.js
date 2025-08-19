// back/test-customer-api.js
const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api';
let authToken = '';

// ฟังก์ชันสำหรับล็อกอิน
async function loginCustomer() {
  try {
    console.log('🔐 ล็อกอินลูกค้า...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'customer1', // เปลี่ยนเป็น username ที่มีอยู่จริง
      password: 'password123'
    });
    
    authToken = response.data.token;
    console.log('✅ ล็อกอินสำเร็จ:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ ล็อกอินล้มเหลว:', error.response?.data?.message || error.message);
    return false;
  }
}

// ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์
async function getProfile() {
  try {
    console.log('\n👤 ดึงข้อมูลโปรไฟล์...');
    const response = await axios.get(`${BASE_URL}/customer/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ ข้อมูลโปรไฟล์:', response.data.profile);
    return response.data.profile;
  } catch (error) {
    console.error('❌ ดึงข้อมูลโปรไฟล์ล้มเหลว:', error.response?.data?.message || error.message);
    return null;
  }
}

// ฟังก์ชันสำหรับอัปเดตข้อมูลโปรไฟล์
async function updateProfile() {
  try {
    console.log('\n✏️ อัปเดตข้อมูลโปรไฟล์...');
    const updateData = {
      phone: '0812345678',
      address: 'กรุงเทพมหานคร, ประเทศไทย'
    };
    
    const response = await axios.put(`${BASE_URL}/customer/profile`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ อัปเดตโปรไฟล์สำเร็จ:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ อัปเดตโปรไฟล์ล้มเหลว:', error.response?.data?.message || error.message);
    return false;
  }
}

// ฟังก์ชันสำหรับดึงสถิติการใช้งาน
async function getStats() {
  try {
    console.log('\n📊 ดึงสถิติการใช้งาน...');
    const response = await axios.get(`${BASE_URL}/customer/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ สถิติการใช้งาน:', response.data.stats);
    return response.data.stats;
  } catch (error) {
    console.error('❌ ดึงสถิติล้มเหลว:', error.response?.data?.message || error.message);
    return null;
  }
}

// ฟังก์ชันสำหรับดึงรายการการจอง
async function getRentals() {
  try {
    console.log('\n🚗 ดึงรายการการจอง...');
    const response = await axios.get(`${BASE_URL}/customer/rentals`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ รายการการจอง:', response.data.rentals.length, 'รายการ');
    response.data.rentals.forEach((rental, index) => {
      console.log(`  ${index + 1}. ${rental.brand} ${rental.model} - สถานะ: ${rental.rental_status}`);
    });
    return response.data.rentals;
  } catch (error) {
    console.error('❌ ดึงรายการการจองล้มเหลว:', error.response?.data?.message || error.message);
    return [];
  }
}

// ฟังก์ชันสำหรับทดสอบการยกเลิกการจอง
async function testCancelRental(rentalId) {
  try {
    console.log(`\n❌ ทดสอบการยกเลิกการจอง ID: ${rentalId}...`);
    const response = await axios.post(`${BASE_URL}/customer/rentals/${rentalId}/cancel`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ ยกเลิกการจองสำเร็จ:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ ยกเลิกการจองล้มเหลว:', error.response?.data?.message || error.message);
    return false;
  }
}

// ฟังก์ชันสำหรับทดสอบการขอคืนรถ
async function testRequestReturn(rentalId) {
  try {
    console.log(`\n🔄 ทดสอบการขอคืนรถ ID: ${rentalId}...`);
    const response = await axios.post(`${BASE_URL}/customer/rentals/${rentalId}/return`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ ขอคืนรถสำเร็จ:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ ขอคืนรถล้มเหลว:', error.response?.data?.message || error.message);
    return false;
  }
}

// ฟังก์ชันหลักสำหรับทดสอบทั้งหมด
async function runAllTests() {
  console.log('🚀 เริ่มทดสอบ Customer API...\n');
  
  // ล็อกอิน
  const loginSuccess = await loginCustomer();
  if (!loginSuccess) {
    console.log('❌ ไม่สามารถล็อกอินได้ ยุติการทดสอบ');
    return;
  }
  
  // ทดสอบ API ต่างๆ
  await getProfile();
  await updateProfile();
  await getStats();
  const rentals = await getRentals();
  
  // ทดสอบการยกเลิกและขอคืนรถ (ถ้ามีการจอง)
  if (rentals.length > 0) {
    const firstRental = rentals[0];
    console.log(`\n🔍 การจองแรก: ID ${firstRental.id}, สถานะ: ${firstRental.rental_status}`);
    
    // ทดสอบการยกเลิก (เฉพาะการจองที่ pending)
    if (firstRental.rental_status === 'pending') {
      await testCancelRental(firstRental.id);
    }
    
    // ทดสอบการขอคืนรถ (เฉพาะการจองที่ confirmed หรือ ongoing)
    if (['confirmed', 'ongoing'].includes(firstRental.rental_status) && firstRental.payment_status === 'paid') {
      await testRequestReturn(firstRental.id);
    }
  }
  
  console.log('\n✅ การทดสอบเสร็จสิ้น!');
}

// รันการทดสอบ
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  loginCustomer,
  getProfile,
  updateProfile,
  getStats,
  getRentals,
  testCancelRental,
  testRequestReturn
};
