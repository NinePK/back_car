// server/controllers/car.controller.js
const db = require('../models/db');

// เพิ่มรถยนต์ใหม่
const addCar = async (req, res) => {
  try {
    const { 
      brand, model, year, license_plate, car_type, transmission, fuel_type,
      seats, color, daily_rate, description, insurance_rate
    } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!brand || !model || !year || !license_plate || !car_type || !transmission || 
        !fuel_type || !seats || !color || !daily_rate) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // ตรวจสอบว่า daily_rate และ insurance_rate เป็นตัวเลขที่ถูกต้อง
    const parsedDailyRate = parseFloat(daily_rate);
    const parsedInsuranceRate = insurance_rate ? parseFloat(insurance_rate) : 0;
    
    if (isNaN(parsedDailyRate) || parsedDailyRate < 0) {
      return res.status(400).json({ message: 'Daily rate must be a valid positive number' });
    }
    
    if (isNaN(parsedInsuranceRate) || parsedInsuranceRate < 0) {
      return res.status(400).json({ message: 'Insurance rate must be a valid non-negative number' });
    }
    
    // เพิ่มข้อมูลรถยนต์ลงในฐานข้อมูล
    const result = await db.create('cars', {
      shop_id: req.user.id,
      brand,
      model, 
      year, 
      license_plate, 
      car_type, 
      transmission, 
      fuel_type, 
      seats, 
      color, 
      daily_rate: parsedDailyRate,
      insurance_rate: parsedInsuranceRate, // บันทึกค่าที่แปลงแล้ว
      description
    });
    
    res.status(201).json({
      message: 'Car added successfully',
      carId: result.insertId
    });
    
  } catch (err) {
    console.error('Add car error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงรายการรถยนต์ของร้านเช่ารถ
const getShopCars = async (req, res) => {
  try {
    const shopId = req.user.id;
    
    // ดึงข้อมูลรถยนต์ทั้งหมดของร้าน
    const cars = await db.executeQuery(
      'SELECT * FROM cars WHERE shop_id = ? ORDER BY created_at DESC',
      [shopId]
    );
    
    // ดึงรูปภาพของรถยนต์แต่ละคัน
    for (const car of cars) {
      const images = await db.executeQuery(
        'SELECT * FROM car_images WHERE car_id = ?',
        [car.id]
      );
      car.images = images;
      
      // ถ้าไม่มี image_url แต่มีรูปภาพ ให้ใช้รูปแรกที่เป็น primary
      if (!car.image_url && images.length > 0) {
        const primaryImage = images.find(img => img.is_primary) || images[0];
        car.image_url = primaryImage.image_url;
      }
    }
    
    res.status(200).json({
      cars
    });
    
  } catch (err) {
    console.error('Get shop cars error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงข้อมูลรถยนต์ตามไอดี
const getCarById = async (req, res) => {
  try {
    const carId = req.params.carId;
    
    // ตรวจสอบว่ามีคอลัมน์ promptpay_id ในตาราง users หรือไม่
    const [columns] = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    
    let query;
    if (columns.length > 0) {
      // ดึงข้อมูลรถยนต์พร้อม promptpay_id
      query = 'SELECT c.*, u.shop_name, u.promptpay_id FROM cars c ' +
              'JOIN users u ON c.shop_id = u.id ' +
              'WHERE c.id = ?';
    } else {
      // ดึงข้อมูลรถยนต์โดยไม่มี promptpay_id
      query = 'SELECT c.*, u.shop_name FROM cars c ' +
              'JOIN users u ON c.shop_id = u.id ' +
              'WHERE c.id = ?';
    }
    
    const [car] = await db.executeQuery(query, [carId]);
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    // ดึงรูปภาพของรถยนต์
    const images = await db.executeQuery(
      'SELECT * FROM car_images WHERE car_id = ?',
      [carId]
    );
    
    car.images = images;
    
    // ถ้าไม่มี image_url แต่มีรูปภาพ ให้ใช้รูปแรกที่เป็น primary
    if (!car.image_url && images.length > 0) {
      const primaryImage = images.find(img => img.is_primary) || images[0];
      car.image_url = primaryImage.image_url;
    }
    
    res.status(200).json({
      car
    });
    
  } catch (err) {
    console.error('Get car error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อัปเดตข้อมูลรถยนต์
const updateCar = async (req, res) => {
  try {
    const carId = req.params.carId;
    const shopId = req.user.id;
    
    // ตรวจสอบว่าเป็นเจ้าของรถยนต์หรือไม่
    const cars = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ? AND shop_id = ?',
      [carId, shopId]
    );
    
    if (cars.length === 0) {
      return res.status(404).json({ message: 'Car not found or you do not have access' });
    }
    
    const { 
      brand, model, year, license_plate, car_type, transmission, fuel_type,
      seats, color, daily_rate, description, status, insurance_rate
    } = req.body;
    
    // เตรียมข้อมูลที่อนุญาตให้อัปเดต
    const updateData = {};
    if (brand) updateData.brand = brand;
    if (model) updateData.model = model;
    if (year) updateData.year = year;
    if (license_plate) updateData.license_plate = license_plate;
    if (car_type) updateData.car_type = car_type;
    if (transmission) updateData.transmission = transmission;
    if (fuel_type) updateData.fuel_type = fuel_type;
    if (seats) updateData.seats = seats;
    if (color) updateData.color = color;
    
    // ตรวจสอบค่า daily_rate และ insurance_rate
    if (daily_rate !== undefined) {
      const parsedDailyRate = parseFloat(daily_rate);
      if (isNaN(parsedDailyRate) || parsedDailyRate < 0) {
        return res.status(400).json({ message: 'Daily rate must be a valid positive number' });
      }
      updateData.daily_rate = parsedDailyRate;
    }
    
    if (insurance_rate !== undefined) {
      const parsedInsuranceRate = parseFloat(insurance_rate);
      if (isNaN(parsedInsuranceRate) || parsedInsuranceRate < 0) {
        return res.status(400).json({ message: 'Insurance rate must be a valid non-negative number' });
      }
      updateData.insurance_rate = parsedInsuranceRate;
    }
    
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    
    // ตรวจสอบว่ามีข้อมูลที่จะอัปเดตหรือไม่
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }
    
    // อัปเดตข้อมูลรถยนต์
    const result = await db.update('cars', carId, updateData);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    res.status(200).json({
      message: 'Car updated successfully'
    });
    
  } catch (err) {
    console.error('Update car error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อัปเดตสถานะรถยนต์
const updateCarStatus = async (req, res) => {
  try {
    const carId = req.params.carId;
    const shopId = req.user.id;
    const { status } = req.body;
    
    // ตรวจสอบว่าส่งสถานะมาหรือไม่
    if (!status) {
      return res.status(400).json({ message: 'กรุณาระบุสถานะ' });
    }
    
    // ตรวจสอบว่าสถานะถูกต้องหรือไม่
    if (!['available', 'rented', 'maintenance', 'hidden'].includes(status)) {
      return res.status(400).json({ 
        message: 'สถานะไม่ถูกต้อง สถานะต้องเป็น available, rented, maintenance หรือ hidden'
      });
    }
    
    // ตรวจสอบว่าเป็นเจ้าของรถยนต์หรือไม่
    const [car] = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ? AND shop_id = ?',
      [carId, shopId]
    );
    
    if (!car) {
      return res.status(404).json({ message: 'ไม่พบรถยนต์หรือคุณไม่มีสิทธิ์เข้าถึง' });
    }
    
    // ตรวจสอบว่ารถกำลังถูกเช่าอยู่หรือไม่ ถ้ากำลังเช่าอยู่ไม่ควรเปลี่ยนเป็น available หรือ hidden
    if ((status === 'available' || status === 'hidden') && car.status === 'rented') {
      // ตรวจสอบว่ามีการเช่าที่กำลังดำเนินอยู่หรือไม่
      const [activeRental] = await db.executeQuery(
        `SELECT COUNT(*) as count FROM rentals 
         WHERE car_id = ? AND rental_status IN ('confirmed', 'ongoing')`,
        [carId]
      );
      
      if (activeRental && activeRental.count > 0) {
        return res.status(400).json({ 
          message: 'ไม่สามารถเปลี่ยนสถานะได้เนื่องจากรถยนต์นี้กำลังถูกเช่าอยู่'
        });
      }
    }
    
    // อัปเดตสถานะรถยนต์
    const result = await db.update('cars', carId, { status });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบรถยนต์' });
    }
    
    // ส่งข้อความตอบกลับพร้อมคำแนะนำเพิ่มเติม
    let message = `อัปเดตสถานะรถยนต์เป็น "${status}" สำเร็จ`;
    let additionalInfo = null;
    
    if (status === 'hidden') {
      additionalInfo = 'รถยนต์นี้จะไม่ปรากฏในหน้าค้นหาสำหรับลูกค้า แต่ยังคงมีอยู่ในระบบพร้อมประวัติการเช่า';
    } else if (status === 'maintenance') {
      additionalInfo = 'รถยนต์นี้จะไม่สามารถจองได้จนกว่าจะเปลี่ยนสถานะกลับเป็น available';
    }
    
    res.status(200).json({
      message,
      additionalInfo
    });
    
  } catch (err) {
    console.error('Update car status error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะรถยนต์' });
  }
};

// ลบรถยนต์
const deleteCar = async (req, res) => {
  try {
    const carId = req.params.carId;
    const shopId = req.user.id;
    
    // ตรวจสอบว่าเป็นเจ้าของรถยนต์หรือไม่
    const [car] = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ? AND shop_id = ?',
      [carId, shopId]
    );
    
    if (!car) {
      return res.status(404).json({ message: 'รถไม่พบในระบบหรือคุณไม่ได้เป็นเจ้าของรถยนต์นี้' });
    }
    
    // ก่อนลบ ให้ตรวจสอบว่ามีการเช่าที่เกี่ยวข้องหรือไม่
    const [rentals] = await db.executeQuery(
      'SELECT COUNT(*) as count FROM rentals WHERE car_id = ?',
      [carId]
    );
    
    if (rentals?.count > 0) {
      // มีการเช่าที่เกี่ยวข้อง ไม่สามารถลบได้โดยตรง
      return res.status(409).json({ 
        message: 'ไม่สามารถลบรถยนต์นี้ได้เนื่องจากมีประวัติการเช่า คุณสามารถเปลี่ยนสถานะเป็นไม่พร้อมให้บริการแทน',
        suggestion: 'โปรดเปลี่ยนสถานะรถเป็น "ไม่พร้อมให้บริการ" แทนการลบ'
      });
    }
    
    // ถ้าไม่มีการเช่าที่เกี่ยวข้อง สามารถลบได้
    const result = await db.remove('cars', carId);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบรถยนต์' });
    }
    
    res.status(200).json({
      message: 'ลบรถยนต์สำเร็จ'
    });
    
  } catch (err) {
    console.error('Delete car error:', err);
    
    // ตรวจสอบว่าเป็น Foreign Key Constraint Error หรือไม่
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ 
        message: 'ไม่สามารถลบรถยนต์นี้ได้เนื่องจากมีข้อมูลการเช่าที่เกี่ยวข้อง กรุณาเปลี่ยนสถานะรถแทนการลบ',
        error_code: 'FOREIGN_KEY_CONSTRAINT'
      });
    }
    
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรถยนต์' });
  }
};
// ค้นหารถยนต์
const searchCars = async (req, res) => {
  try {
    let conditions = [];
    let values = [];
    
    // ตรวจสอบว่ามีคอลัมน์ promptpay_id ในตาราง users หรือไม่
    const [columns] = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    
    let query;
    if (columns.length > 0) {
      // ดึงข้อมูลรถยนต์พร้อม promptpay_id (แสดงทุกสถานะยกเว้น hidden)
      query = 'SELECT c.*, u.shop_name, u.promptpay_id FROM cars c JOIN users u ON c.shop_id = u.id WHERE c.status != "hidden"';
    } else {
      // ดึงข้อมูลรถยนต์โดยไม่มี promptpay_id (แสดงทุกสถานะยกเว้น hidden)
      query = 'SELECT c.*, u.shop_name FROM cars c JOIN users u ON c.shop_id = u.id WHERE c.status != "hidden"';
    }
    
    // กรองตามเงื่อนไขต่าง ๆ
    if (req.query.brand) {
      conditions.push('c.brand LIKE ?');
      values.push(`%${req.query.brand}%`);
    }
    
    if (req.query.model) {
      conditions.push('c.model LIKE ?');
      values.push(`%${req.query.model}%`);
    }
    
    if (req.query.car_type) {
      conditions.push('c.car_type = ?');
      values.push(req.query.car_type);
    }
    
    if (req.query.min_price) {
      conditions.push('c.daily_rate >= ?');
      values.push(Number(req.query.min_price));
    }
    
    if (req.query.max_price) {
      conditions.push('c.daily_rate <= ?');
      values.push(Number(req.query.max_price));
    }
    
    if (req.query.seats) {
      conditions.push('c.seats >= ?');
      values.push(Number(req.query.seats));
    }
    
    if (req.query.transmission) {
      conditions.push('c.transmission = ?');
      values.push(req.query.transmission);
    }
    
    if (req.query.fuel_type) {
      conditions.push('c.fuel_type = ?');
      values.push(req.query.fuel_type);
    }
    
    // เพิ่มเงื่อนไขในคำสั่ง SQL
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    // จัดเรียงผลลัพธ์
    query += ' ORDER BY c.created_at DESC';
    
    // จำกัดจำนวนผลลัพธ์ถ้ามีการระบุ
    if (req.query.limit) {
      query += ' LIMIT ?';
      values.push(Number(req.query.limit));
    }
    
    const cars = await db.executeQuery(query, values);
    
    // ดึงรูปภาพของรถยนต์แต่ละคัน
    for (const car of cars) {
      const images = await db.executeQuery(
        'SELECT * FROM car_images WHERE car_id = ?',
        [car.id]
      );
      car.images = images;
      
      // ถ้าไม่มี image_url แต่มีรูปภาพ ให้ใช้รูปแรกที่เป็น primary
      if (!car.image_url && images.length > 0) {
        const primaryImage = images.find(img => img.is_primary) || images[0];
        car.image_url = primaryImage.image_url;
      }
    }
    
    res.status(200).json({
      cars
    });
    
  } catch (err) {
    console.error('Search cars error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงข้อมูลรถยนต์สำหรับลูกค้า
const getCarForCustomer = async (req, res) => {
  try {
    const carId = req.params.carId;
    
    // ตรวจสอบว่ามีคอลัมน์ promptpay_id ในตาราง users หรือไม่
    const [columns] = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    
    let query;
    if (columns.length > 0) {
      // ดึงข้อมูลรถยนต์พร้อม promptpay_id
      query = `SELECT c.*, u.shop_name, u.address as shop_address, u.phone as shop_phone, u.promptpay_id
              FROM cars c 
              JOIN users u ON c.shop_id = u.id 
              WHERE c.id = ? AND c.status != 'hidden'`;
    } else {
      // ดึงข้อมูลรถยนต์โดยไม่มี promptpay_id
      query = `SELECT c.*, u.shop_name, u.address as shop_address, u.phone as shop_phone
              FROM cars c 
              JOIN users u ON c.shop_id = u.id 
              WHERE c.id = ? AND c.status != 'hidden'`;
    }
    
    const [car] = await db.executeQuery(query, [carId]);
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    // ดึงรูปภาพของรถยนต์
    const images = await db.executeQuery(
      'SELECT * FROM car_images WHERE car_id = ?',
      [carId]
    );
    
    car.images = images;
    
    // ถ้าไม่มี image_url แต่มีรูปภาพ ให้ใช้รูปแรกที่เป็น primary
    if (!car.image_url && images.length > 0) {
      const primaryImage = images.find(img => img.is_primary) || images[0];
      car.image_url = primaryImage.image_url;
    }
    
    res.status(200).json({
      car
    });
    
  } catch (err) {
    console.error('Get car details error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getShopCarsByShopId = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    
    // ตรวจสอบว่ามีคอลัมน์ promptpay_id ในตาราง users หรือไม่
    const [columns] = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    
    let query;
    if (columns.length > 0) {
      // ตรวจสอบว่าร้านมีอยู่จริงหรือไม่ และดึง promptpay_id
      query = 'SELECT id, promptpay_id FROM users WHERE id = ? AND role = "shop" AND status = "active"';
    } else {
      // ตรวจสอบว่าร้านมีอยู่จริงหรือไม่ โดยไม่มี promptpay_id
      query = 'SELECT id FROM users WHERE id = ? AND role = "shop" AND status = "active"';
    }
    
    const [shop] = await db.executeQuery(query, [shopId]);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // ดึงข้อมูลรถยนต์ทั้งหมดของร้าน
    const cars = await db.executeQuery(
      'SELECT * FROM cars WHERE shop_id = ? AND status = "available" ORDER BY created_at DESC',
      [shopId]
    );
    
    // ดึงรูปภาพของรถยนต์แต่ละคัน
    for (const car of cars) {
      const images = await db.executeQuery(
        'SELECT * FROM car_images WHERE car_id = ?',
        [car.id]
      );
      car.images = images;
      
      // ถ้าไม่มี image_url แต่มีรูปภาพ ให้ใช้รูปแรกที่เป็น primary
      if (!car.image_url && images.length > 0) {
        const primaryImage = images.find(img => img.is_primary) || images[0];
        car.image_url = primaryImage.image_url;
      }
      
      // เพิ่ม promptpay_id ของร้านเช่าไปในข้อมูลรถ (ถ้ามี)
      if (columns.length > 0 && shop.promptpay_id) {
        car.promptpay_id = shop.promptpay_id;
      }
    }
    
    const response = {
      cars
    };
    
    // เพิ่ม promptpay_id ของร้าน (ถ้ามี)
    if (columns.length > 0 && shop.promptpay_id) {
      response.shop_promptpay_id = shop.promptpay_id;
    }
    
    res.status(200).json(response);
    
  } catch (err) {
    console.error('Get shop cars error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงรถยนต์แนะนำ (featured cars)
const getFeaturedCars = async (req, res) => {
  try {
    // ตรวจสอบว่ามีคอลัมน์ promptpay_id ในตาราง users หรือไม่
    const [columns] = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    
    let query;
    if (columns.length > 0) {
      // ดึงข้อมูลรถยนต์แนะนำพร้อม promptpay_id
      query = `SELECT c.*, u.shop_name, u.promptpay_id
              FROM cars c 
              JOIN users u ON c.shop_id = u.id 
              WHERE c.status = 'available' AND c.status != 'hidden'
              ORDER BY c.created_at DESC, c.daily_rate ASC
              LIMIT 6`;
    } else {
      // ดึงข้อมูลรถยนต์แนะนำโดยไม่มี promptpay_id
      query = `SELECT c.*, u.shop_name
              FROM cars c 
              JOIN users u ON c.shop_id = u.id 
              WHERE c.status = 'available' AND c.status != 'hidden'
              ORDER BY c.created_at DESC, c.daily_rate ASC
              LIMIT 6`;
    }
    
    const cars = await db.executeQuery(query);
    
    // ดึงรูปภาพของรถยนต์แต่ละคัน
    for (const car of cars) {
      const images = await db.executeQuery(
        'SELECT * FROM car_images WHERE car_id = ?',
        [car.id]
      );
      car.images = images;
      
      // ถ้าไม่มี image_url แต่มีรูปภาพ ให้ใช้รูปแรกที่เป็น primary
      if (!car.image_url && images.length > 0) {
        const primaryImage = images.find(img => img.is_primary) || images[0];
        car.image_url = primaryImage.image_url;
      }
    }
    
    res.status(200).json({
      cars
    });
    
  } catch (err) {
    console.error('Get featured cars error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// แก้ไข module.exports เพื่อเพิ่มฟังก์ชันใหม่
module.exports = {
  addCar,
  getShopCars,
  getShopCarsByShopId,
  getCarById,
  updateCar,
  updateCarStatus,
  deleteCar,
  searchCars,
  getCarForCustomer,
  getFeaturedCars
};