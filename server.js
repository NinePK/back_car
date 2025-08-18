// server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // เพิ่มการใช้งาน fs module
const { config, testDbConnection } = require('./config');
const db = require('./models/db');

// นำเข้าเส้นทาง (routes)
const authRoutes = require('./routes/auth.routes');
const carRoutes = require('./routes/car.routes');
const shopRoutes = require('./routes/shop.routes');
const rentalRoutes = require('./routes/rental.routes');
const imageRoutes = require('./routes/image.routes'); // เพิ่ม route สำหรับรูปภาพ
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes'); // เพิ่ม route สำหรับรีวิว

const { authenticateToken, isShop } = require('./middleware');
const app = express();
const carController = require('./controllers/car.controller');
// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadsDir}`);
  } catch (err) {
    console.error(`Failed to create uploads directory: ${err.message}`);
  }
}

// ตรวจสอบและแสดงสิทธิ์การเขียนของโฟลเดอร์ uploads
try {
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  console.log(`Uploads directory is writable: ${uploadsDir}`);
} catch (err) {
  console.error(`WARNING: Uploads directory is NOT writable: ${uploadsDir}`, err.message);
  console.error('File uploads may fail. Please check directory permissions.');
}

// Middleware
app.use(cors());
app.use(express.json());

// ตั้งค่า static files สำหรับรูปภาพ
app.use('/uploads', express.static(uploadsDir));
console.log(`Serving static files from: ${uploadsDir}`);

// กำหนดเส้นทาง API
app.use('/api', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api', rentalRoutes);
app.use('/api', imageRoutes); // เพิ่ม route สำหรับรูปภาพ
app.use('/api', paymentRoutes);
app.use('/api', reviewRoutes); // เพิ่ม route สำหรับรีวิว


app.get('/api/shops/dashboard/cars', authenticateToken, isShop, (req, res) => {
  // เรียกใช้ controller ที่มีอยู่แล้ว
  carController.getShopCars(req, res);
});

app.get('/api/status', (req, res) => {
  res.status(200).json({ 
    status: 'Server is running',
    uploadsPath: uploadsDir,
    uploadsExists: fs.existsSync(uploadsDir),
    uploadsWritable: (() => {
      try {
        fs.accessSync(uploadsDir, fs.constants.W_OK);
        return true;
      } catch (err) {
        return false;
      }
    })()
  });
});

// จัดการกับเส้นทางที่ไม่มี
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// จัดการกับข้อผิดพลาดทั่วไป
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});




// เพิ่มเส้นทาง API สำหรับการชำระเงิน
app.use('/api', paymentRoutes);

const paymentsDir = path.join(__dirname, '..', 'uploads', 'payments');
if (!fs.existsSync(paymentsDir)) {
  try {
    fs.mkdirSync(paymentsDir, { recursive: true });
    console.log(`Created payments directory: ${paymentsDir}`);
  } catch (err) {
    console.error(`Failed to create payments directory: ${err.message}`);
  }
}
app.use('/uploads/payments', express.static(paymentsDir));
console.log(`Serving payment proofs from: ${paymentsDir}`);









// เริ่มต้นการทำงานของเซิร์ฟเวอร์
async function startServer() {
  try {
    // ทดสอบการเชื่อมต่อฐานข้อมูล
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }
    
    // สร้างตารางเริ่มต้น
    const initialized = await db.initializeDatabase();
    if (!initialized) {
      console.error('Failed to initialize database');
      process.exit(1);
    }
    
    // เริ่มเซิร์ฟเวอร์
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Upload directory: ${uploadsDir}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}


startServer();