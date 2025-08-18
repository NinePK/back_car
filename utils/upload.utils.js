// server/utils/upload.utils.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ตั้งค่า storage สำหรับ multer (อัพโหลดไฟล์)
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// ฟิลเตอร์สำหรับไฟล์
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// สร้าง multer middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // จำกัดขนาด 2MB ต่อไฟล์
  fileFilter: fileFilter
});

module.exports = {
  upload
};