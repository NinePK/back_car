// server/config.js
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

// โหลดค่าจาก .env file
dotenv.config();

// การตั้งค่าพื้นฐาน
const config = {
  port: process.env.PORT || 8000,
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  dbConfig: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_rental'
  }
};

// สร้าง pool connection เพื่อจัดการการเชื่อมต่อ
const pool = mysql.createPool(config.dbConfig);

// ฟังก์ชันทดสอบการเชื่อมต่อกับฐานข้อมูล
const testDbConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
};

module.exports = {
  config,
  pool,
  testDbConnection
};