// server/middlewares/upload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// กำหนดพาธของโฟลเดอร์ uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// ตรวจสอบและสร้างโฟลเดอร์ uploads ถ้ายังไม่มี
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadsDir}`);
  } catch (err) {
    console.error(`Error creating uploads directory: ${err.message}`);
  }
}

// ตรวจสอบสิทธิ์การเขียน
try {
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  console.log(`Uploads directory is writable: ${uploadsDir}`);
} catch (err) {
  console.error(`WARNING: Uploads directory is NOT writable: ${uploadsDir}`);
  console.error('File uploads will fail! Please check directory permissions.');
}

// กำหนดการจัดเก็บไฟล์
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // ตรวจสอบอีกครั้งว่าโฟลเดอร์มีอยู่จริง
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    
    console.log(`Saving uploaded file as: ${filename}`);
    cb(null, filename);
  }
});

// กำหนดการกรองไฟล์
const fileFilter = (req, file, cb) => {
  // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
  if (file.mimetype.startsWith('image/')) {
    console.log(`Accepting file: ${file.originalname}, type: ${file.mimetype}`);
    cb(null, true);
  } else {
    console.log(`Rejecting file: ${file.originalname}, type: ${file.mimetype}`);
    cb(new Error('Only image files are allowed!'), false);
  }
};

// สร้าง middleware สำหรับอัปโหลดไฟล์
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // จำกัดขนาด 5MB
  },
  fileFilter: fileFilter
});

module.exports = {
  upload,
  uploadsDir
};