// สำหรับทดสอบระบบแจ้งเตือน - สร้างข้อมูลตัวอย่าง
const bcrypt = require('bcrypt');
const db = require('./models/db');

const createTestData = async () => {
  try {
    console.log('กำลังสร้างข้อมูลทดสอบ...');

    // สร้าง shop user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const shopUser = await db.create('users', {
      username: 'testshop',
      email: 'shop@test.com',
      password: hashedPassword,
      role: 'shop',
      phone: '081-234-5678',
      shop_name: 'ร้านเช่ารถทดสอบ',
      shop_description: 'ร้านเช่ารถสำหรับทดสอบระบบ',
      promptpay_id: '0812345678'
    });

    console.log('สร้าง shop user สำเร็จ ID:', shopUser.insertId);

    // สร้าง customer user
    const customerUser = await db.create('users', {
      username: 'testcustomer',
      email: 'customer@test.com',
      password: hashedPassword,
      role: 'customer',
      phone: '087-654-3210'
    });

    console.log('สร้าง customer user สำเร็จ ID:', customerUser.insertId);

    // สร้างรถยนต์
    const car = await db.create('cars', {
      shop_id: shopUser.insertId,
      brand: 'Toyota',
      model: 'Camry',
      year: 2023,
      license_plate: 'กข-1234',
      car_type: 'sedan',
      transmission: 'auto',
      fuel_type: 'gasoline',
      seats: 5,
      color: 'เงิน',
      daily_rate: 1500.00,
      insurance_rate: 300.00,
      status: 'available',
      description: 'รถยนต์ทดสอบระบบ'
    });

    console.log('สร้างรถยนต์สำเร็จ ID:', car.insertId);

    // สร้างการจองที่รอการอนุมัติ
    const rental = await db.create('rentals', {
      car_id: car.insertId,
      customer_id: customerUser.insertId,
      shop_id: shopUser.insertId,
      start_date: '2024-12-25',
      end_date: '2024-12-27',
      pickup_location: 'สนามบินสุวรรณภูมิ',
      return_location: 'สนามบินสุวรรณภูมิ',
      rental_status: 'pending',
      payment_status: 'pending',
      total_amount: 3600.00,
      insurance_rate: 300.00
    });

    console.log('สร้างการจองสำเร็จ ID:', rental.insertId);

    // สร้างการจองที่มีการชำระเงินรอยืนยัน
    const rental2 = await db.create('rentals', {
      car_id: car.insertId,
      customer_id: customerUser.insertId,
      shop_id: shopUser.insertId,
      start_date: '2024-12-28',
      end_date: '2024-12-30',
      pickup_location: 'โรงแรม',
      return_location: 'โรงแรม',
      rental_status: 'pending',
      payment_status: 'pending_verification',
      total_amount: 3600.00,
      insurance_rate: 300.00
    });

    console.log('สร้างการจอง 2 สำเร็จ ID:', rental2.insertId);

    // สร้างข้อมูลการชำระเงิน
    const payment = await db.create('payments', {
      rental_id: rental2.insertId,
      payment_method: 'promptpay',
      amount: 3600.00,
      payment_date: new Date(),
      payment_status: 'pending_verification',
      proof_image: '/uploads/payments/payment-test.png'
    });

    console.log('สร้างข้อมูลการชำระเงินสำเร็จ ID:', payment.insertId);

    console.log('\n✅ สร้างข้อมูลทดสอบเสร็จสิ้น!');
    console.log('ข้อมูลการเข้าสู่ระบบ:');
    console.log('Shop: shop@test.com / password123');
    console.log('Customer: customer@test.com / password123');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสร้างข้อมูลทดสอบ:', error);
  }
};

// ตรวจสอบข้อมูลที่มีอยู่
const checkExistingData = async () => {
  try {
    console.log('\n=== ตรวจสอบข้อมูลที่มีอยู่ ===');
    
    // ตรวจสอบ users
    const users = await db.executeQuery('SELECT id, username, email, role FROM users');
    console.log('Users:', users);
    
    // ตรวจสอบ cars
    const cars = await db.executeQuery('SELECT id, shop_id, brand, model, status FROM cars');
    console.log('Cars:', cars);
    
    // ตรวจสอบ rentals
    const rentals = await db.executeQuery('SELECT id, car_id, customer_id, shop_id, rental_status, payment_status FROM rentals');
    console.log('Rentals:', rentals);
    
    // ตรวจสอบ payments
    const payments = await db.executeQuery('SELECT id, rental_id, payment_status, amount FROM payments');
    console.log('Payments:', payments);
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล:', error);
  }
};

// เรียกใช้ฟังก์ชัน
if (require.main === module) {
  (async () => {
    await checkExistingData();
    
    // ถามว่าต้องการสร้างข้อมูลทดสอบใหม่หรือไม่
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('ต้องการสร้างข้อมูลทดสอบใหม่? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await createTestData();
        await checkExistingData();
      }
      rl.close();
      process.exit(0);
    });
  })();
}

module.exports = { createTestData, checkExistingData };