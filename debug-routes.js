// Debug routes ที่มีอยู่ในระบบ
const express = require('express');

// สร้าง app ชั่วคราวเพื่อดู routes
const app = express();

// import routes
const rentalRoutes = require('./routes/rental.routes');
const paymentRoutes = require('./routes/payment.routes');

// ใช้ routes
app.use('/api', rentalRoutes);
app.use('/api', paymentRoutes);

// ฟังก์ชันแสดง routes ทั้งหมด
function printRoutes(app) {
  console.log('=== Available Routes ===');
  
  app._router.stack.forEach(function(middleware) {
    if (middleware.route) {
      // Routes ที่ register โดยตรง
      console.log(middleware.route.stack[0].method.toUpperCase(), middleware.route.path);
    } else if (middleware.name === 'router') {
      // Routes ที่ register ผ่าน router
      middleware.handle.stack.forEach(function(handler) {
        if (handler.route) {
          const path = '/api' + handler.route.path;
          const method = handler.route.stack[0].method.toUpperCase();
          console.log(method, path);
        }
      });
    }
  });
}

printRoutes(app);

// ทดสอบ route matching
console.log('\n=== Route Testing ===');
const routes = [
  'GET /api/shop/rentals/pending',
  'GET /api/shop/bookings/pending', 
  'GET /api/shop/pending-payments'
];

routes.forEach(route => {
  console.log(`Testing: ${route}`);
  // ลองจำลอง request
  const [method, path] = route.split(' ');
  console.log(`  Method: ${method}, Path: ${path}`);
});

console.log('\n=== Controllers Available ===');
const rentalController = require('./controllers/rental.controller');
const paymentController = require('./controllers/payment.controller');

console.log('Rental Controller methods:');
Object.keys(rentalController).forEach(method => {
  console.log(`  - ${method}`);
});

console.log('\nPayment Controller methods:');
Object.keys(paymentController).forEach(method => {
  console.log(`  - ${method}`);
});