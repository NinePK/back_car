// server/controllers/image.controller.js
const fs = require('fs');
const path = require('path');
const db = require('../models/db');

// อัปโหลดรูปภาพรถยนต์
const uploadCarImages = async (req, res) => {
  try {
    const carId = req.params.carId;
    const isPrimary = req.body.is_primary === 'true';
    
    // ตรวจสอบว่ามีไฟล์ถูกอัปโหลดมาหรือไม่
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // ตรวจสอบว่าเป็นเจ้าของรถยนต์หรือไม่
    const cars = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ? AND shop_id = ?',
      [carId, req.user.id]
    );
    
    if (!cars || cars.length === 0) {
      // ลบไฟล์ที่อัปโหลดแล้วทิ้ง เนื่องจากไม่มีสิทธิ์
      for (const file of req.files) {
        try {
          fs.unlinkSync(file.path);
          console.log(`Deleted file ${file.path} - User has no access to car ${carId}`);
        } catch (err) {
          console.error(`Error deleting file ${file.path}:`, err.message);
        }
      }
      return res.status(404).json({ message: 'Car not found or you do not have access' });
    }
    
    // ถ้าเป็นรูปแรกหรือระบุว่าเป็นรูปหลัก ให้อัปเดตรูปเดิมให้ไม่เป็นรูปหลัก
    if (isPrimary) {
      await db.executeQuery(
        'UPDATE car_images SET is_primary = false WHERE car_id = ?',
        [carId]
      );
      console.log(`Updated all existing images for car ${carId} to non-primary`);
    }
    
    // เก็บข้อมูลรูปภาพที่อัปโหลดสำเร็จ
    const uploadedImages = [];
    
    // บันทึกข้อมูลรูปภาพลงในฐานข้อมูล
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      // ตรวจสอบว่าไฟล์ถูกบันทึกจริงหรือไม่
      if (!fs.existsSync(file.path)) {
        console.error(`File was not saved to disk: ${file.path}`);
        continue;
      }

      // สร้าง URL สำหรับเข้าถึงรูปภาพ
      const imageUrl = `/uploads/${path.basename(file.path)}`;
      console.log(`Created image URL: ${imageUrl} for file: ${file.originalname}`);
      
      // กำหนดว่าเป็นรูปหลักหรือไม่ (รูปแรกจะเป็นรูปหลักถ้ากำหนดให้เป็นรูปหลัก)
      const isPrimaryImage = isPrimary && i === 0;
      
      // บันทึกข้อมูลลงในฐานข้อมูล โดยใช้ db.create แทน executeQuery
      try {
        // ใช้ db.create ที่เป็นฟังก์ชันที่เหมาะกับการ INSERT แทน executeQuery
        const result = await db.create('car_images', {
          car_id: carId,
          image_url: imageUrl,
          is_primary: isPrimaryImage ? 1 : 0
        });
        
        console.log(`Saved image to database, ID: ${result.insertId}`);
        
        uploadedImages.push({
          id: result.insertId,
          imageUrl: imageUrl,
          isPrimary: isPrimaryImage
        });
      } catch (dbError) {
        console.error(`Database error saving image: ${dbError.message}`);
        
        // ถ้าไม่สามารถบันทึกลงฐานข้อมูลได้ ให้ลบไฟล์ทิ้ง
        try {
          fs.unlinkSync(file.path);
          console.log(`Deleted file ${file.path} due to database error`);
        } catch (unlinkError) {
          console.error(`Error deleting file ${file.path}:`, unlinkError.message);
        }
      }
    }
    
    // ถ้าไม่มีรูปที่อัปโหลดสำเร็จ
    if (uploadedImages.length === 0) {
      return res.status(500).json({ message: 'Failed to upload images. No images were saved.' });
    }
    
    // อัปเดตรูปหลักของรถยนต์ในตาราง cars
    if (isPrimary && uploadedImages.length > 0) {
      // ใช้ db.update แทน executeQuery
      await db.update('cars', carId, { image_url: uploadedImages[0].imageUrl });
      console.log(`Updated car's primary image: ${uploadedImages[0].imageUrl}`);
    }
    
    // ส่งผลลัพธ์กลับไปให้ client
    res.status(200).json({
      message: 'Car images uploaded successfully',
      images: uploadedImages
    });
    
  } catch (err) {
    console.error('Upload car images error:', err);
    res.status(500).json({ 
      message: 'Server error during image upload',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ลบรูปภาพรถยนต์
const deleteCarImage = async (req, res) => {
  try {
    const carId = req.params.carId;
    const imageId = req.params.imageId;
    
    // ตรวจสอบว่าเป็นเจ้าของรถยนต์หรือไม่
    const cars = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ? AND shop_id = ?',
      [carId, req.user.id]
    );
    
    if (!cars || cars.length === 0) {
      return res.status(404).json({ message: 'Car not found or you do not have access' });
    }
    
    // ดึงข้อมูลรูปภาพ
    const images = await db.executeQuery(
      'SELECT * FROM car_images WHERE id = ? AND car_id = ?',
      [imageId, carId]
    );
    
    if (!images || images.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const image = images[0];
    
    // ลบข้อมูลรูปภาพออกจากฐานข้อมูล
    await db.remove('car_images', imageId);
    
    // ลบไฟล์รูปภาพ
    const imagePath = path.join(__dirname, '..', '..', image.image_url.replace(/^\//, ''));
    
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Deleted image file: ${imagePath}`);
      } else {
        console.warn(`Image file not found: ${imagePath}`);
      }
    } catch (unlinkError) {
      console.error(`Error deleting image file: ${unlinkError.message}`);
      // ไม่จำเป็นต้อง return error เพราะลบข้อมูลในฐานข้อมูลสำเร็จแล้ว
    }
    
    // ถ้ารูปที่ลบเป็นรูปหลัก ให้อัปเดตรูปหลักใหม่
    if (image.is_primary) {
      // ดึงรูปภาพอื่นๆ ของรถคันนี้
      const otherImages = await db.executeQuery(
        'SELECT * FROM car_images WHERE car_id = ? ORDER BY id ASC LIMIT 1',
        [carId]
      );
      
      if (otherImages && otherImages.length > 0) {
        // กำหนดให้รูปแรกเป็นรูปหลัก
        await db.update('car_images', otherImages[0].id, { is_primary: true });
        
        // อัปเดตรูปหลักในตาราง cars
        await db.update('cars', carId, { image_url: otherImages[0].image_url });
        
        console.log(`Updated car's primary image to: ${otherImages[0].image_url}`);
      } else {
        // ถ้าไม่มีรูปอื่นเหลือ ให้ตั้งค่า image_url เป็น null
        await db.update('cars', carId, { image_url: null });
        
        console.log(`Removed car's primary image since no images left`);
      }
    }
    
    res.status(200).json({
      message: 'Car image deleted successfully'
    });
    
  } catch (err) {
    console.error('Delete car image error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// กำหนดรูปหลัก
const setPrimaryImage = async (req, res) => {
  try {
    const carId = req.params.carId;
    const imageId = req.params.imageId;
    
    // ตรวจสอบว่าเป็นเจ้าของรถยนต์หรือไม่
    const cars = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ? AND shop_id = ?',
      [carId, req.user.id]
    );
    
    if (!cars || cars.length === 0) {
      return res.status(404).json({ message: 'Car not found or you do not have access' });
    }
    
    // ตรวจสอบว่ารูปภาพมีอยู่จริงหรือไม่
    const images = await db.executeQuery(
      'SELECT * FROM car_images WHERE id = ? AND car_id = ?',
      [imageId, carId]
    );
    
    if (!images || images.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const image = images[0];
    
    // ยกเลิกรูปหลักอื่นๆ
    await db.executeQuery(
      'UPDATE car_images SET is_primary = false WHERE car_id = ?',
      [carId]
    );
    
    // กำหนดรูปนี้เป็นรูปหลัก
    await db.update('car_images', imageId, { is_primary: true });
    
    // อัปเดตรูปหลักในตาราง cars
    await db.update('cars', carId, { image_url: image.image_url });
    
    res.status(200).json({
      message: 'Primary image updated successfully'
    });
    
  } catch (err) {
    console.error('Set primary image error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadCarImages,
  deleteCarImage,
  setPrimaryImage
};