// server/controllers/rental.controller.js
const db = require('../models/db');
const crypto = require('crypto');
const QRCode = require('qrcode');

// สร้างคำขอเช่ารถ
// แก้ไขฟังก์ชัน createRental ในไฟล์ rental.controller.js เพื่อรวมค่าประกันในการคำนวณราคา
// และสร้าง Payment QR Code ทันทีหลังจากที่สร้างการจองเสร็จ
// server/controllers/rental.controller.js

// ฟังก์ชันสร้างการเช่ารถใหม่ (แก้ไขแล้ว)
const createRental = async (req, res) => {
  try {
    const { car_id, start_date, end_date, pickup_location, return_location, total_amount: clientTotalAmount } = req.body;
    const customer_id = req.user.id;

    console.log('Received rental request:', { 
      car_id, 
      start_date, 
      end_date, 
      pickup_location, 
      return_location, 
      clientTotalAmount 
    });

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!car_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // ดึงข้อมูลรถยนต์
    const [car] = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ?',
      [car_id]
    );

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // ตรวจสอบสถานะรถ
    if (car.status !== 'available') {
      return res.status(400).json({ message: 'Car is not available for rental' });
    }

    // ตรวจสอบช่วงเวลาการเช่าว่าซ้อนทับกับการจองอื่นหรือไม่
    const conflictingRentals = await db.executeQuery(
      `SELECT * FROM rentals 
       WHERE car_id = ? 
       AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date) OR (? BETWEEN start_date AND end_date))
       AND rental_status NOT IN ('cancelled', 'completed', 'return_approved')`,
      [car_id, start_date, end_date, start_date, end_date, start_date, end_date]
    );

    if (conflictingRentals.length > 0) {
      const conflictingRental = conflictingRentals[0];
      const conflictStart = new Date(conflictingRental.start_date).toLocaleDateString('th-TH');
      const conflictEnd = new Date(conflictingRental.end_date).toLocaleDateString('th-TH');
      
      return res.status(409).json({ 
        message: `รถคันนี้ถูกจองไปแล้วในช่วงวันที่ ${conflictStart} - ${conflictEnd} กรุณาเลือกช่วงวันที่อื่น`,
        conflictingDates: {
          start: conflictingRental.start_date,
          end: conflictingRental.end_date
        }
      });
    }

    // คำนวณราคาค่าเช่าทั้งหมด
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Make sure daily_rate and insurance_rate are numbers
    const dailyRate = parseFloat(car.daily_rate) || 0;
    const insuranceRate = parseFloat(car.insurance_rate) || 0;
    
    // ราคารวม = จำนวนวัน * (ราคาเช่าต่อวัน + ค่าประกันต่อวัน)
    // Use client-provided total if valid, otherwise calculate on server
    let total_amount;
    
    if (clientTotalAmount && !isNaN(parseFloat(clientTotalAmount)) && parseFloat(clientTotalAmount) > 0) {
      total_amount = parseFloat(clientTotalAmount);
    } else {
      total_amount = days * (dailyRate + insuranceRate);
    }
    
    // Safety check to ensure total_amount is a valid number
    if (isNaN(total_amount) || total_amount <= 0) {
      console.error('Invalid total_amount calculated:', {
        days, dailyRate, insuranceRate, clientTotalAmount
      });
      return res.status(400).json({ message: 'Cannot calculate total amount. Please check dates and pricing.' });
    }

    console.log('Creating rental with total amount:', total_amount);

    // สร้างรายการเช่า
    const result = await db.create('rentals', {
      car_id,
      customer_id,
      shop_id: car.shop_id,
      start_date,
      end_date,
      pickup_location,
      return_location,
      total_amount, // Use the validated total amount
      insurance_rate: insuranceRate,
      payment_status: 'pending',
      rental_status: 'pending'
    });

    // ตอบกลับด้วยข้อมูลการจองที่สร้างขึ้น
    res.status(201).json({
      message: 'Rental created successfully',
      rental_id: result.insertId,
      // Redirect to payment page
      redirect_to_payment: true,
      payment_url: `/customer/payments/${result.insertId}`
    });
  } catch (err) {
    console.error('Create rental error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ดึงรายการเช่ารถของลูกค้า
const getCustomerRentals = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    const rentals = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year, c.image_url, u.shop_name, u.username as shop_username,
              CASE WHEN rv.id IS NOT NULL THEN 1 ELSE 0 END as has_review
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.shop_id = u.id
       LEFT JOIN reviews rv ON r.id = rv.rental_id
       WHERE r.customer_id = ?
       ORDER BY r.created_at DESC`,
      [customerId]
    );
    
    res.status(200).json({
      rentals
    });
  } catch (err) {
    console.error('Get customer rentals error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงรายละเอียดการเช่ารถ
const getRentalDetails = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const customerId = req.user.id;
    
    const [rental] = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year, c.car_type, c.transmission, c.fuel_type, 
              c.seats, c.color, c.license_plate, c.image_url, 
              u.shop_name, u.phone as shop_phone, u.address as shop_address
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.shop_id = u.id
       WHERE r.id = ? AND r.customer_id = ?`,
      [rentalId, customerId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ดึงรูปภาพของรถยนต์
    const images = await db.executeQuery(
      'SELECT * FROM car_images WHERE car_id = ?',
      [rental.car_id]
    );
    
    rental.images = images;
    
    res.status(200).json({
      rental
    });
  } catch (err) {
    console.error('Get rental details error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ยกเลิกการจองรถ
const cancelRental = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const customerId = req.user.id;
    
    // ตรวจสอบการเช่ารถ
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND customer_id = ?',
      [rentalId, customerId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ตรวจสอบว่าสามารถยกเลิกได้หรือไม่ - ยกเลิกได้เฉพาะเมื่อยังไม่ได้ชำระเงิน
    if (rental.rental_status === 'completed') {
      return res.status(400).json({ message: 'ไม่สามารถยกเลิกการจองที่เสร็จสิ้นแล้ว' });
    }
    
    if (rental.rental_status === 'ongoing') {
      return res.status(400).json({ message: 'ไม่สามารถยกเลิกการจองที่กำลังดำเนินการอยู่' });
    }
    
    // ตรวจสอบสถานะการชำระเงิน - ยกเลิกได้เฉพาะเมื่อยังไม่ได้ชำระเงินหรือชำระเงินล้มเหลว
    if (rental.payment_status === 'paid') {
      return res.status(400).json({ message: 'ไม่สามารถยกเลิกการจองที่ชำระเงินแล้ว' });
    }
    
    if (rental.payment_status === 'refunded' || rental.payment_status === 'refund_pending') {
      return res.status(400).json({ message: 'ไม่สามารถยกเลิกการจองที่อยู่ในขั้นตอนการคืนเงิน' });
    }
    
    // อัปเดตสถานะการเช่า
    await db.update('rentals', rentalId, {
      rental_status: 'cancelled'
    });
    
    // อัปเดตสถานะการชำระเงิน (ถ้ามี)
    if (rental.payment_status === 'pending') {
      // ดึงข้อมูลการชำระเงิน
      const [payment] = await db.executeQuery(
        'SELECT * FROM payments WHERE rental_id = ?',
        [rentalId]
      );
      
      if (payment) {
        await db.update('payments', payment.id, {
          payment_status: 'cancelled'
        });
      }
    }
    
    // อัปเดตสถานะรถยนต์ - เฉพาะเมื่อรถถูกจองไว้ (rented) ให้เปลี่ยนกลับเป็น available
    const [car] = await db.executeQuery(
      'SELECT status FROM cars WHERE id = ?',
      [rental.car_id]
    );
    
    if (car && car.status === 'rented') {
      await db.update('cars', rental.car_id, {
        status: 'available'
      });
    }
    
    res.status(200).json({
      message: 'Rental cancelled successfully'
    });
  } catch (err) {
    console.error('Cancel rental error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงรายการเช่ารถของร้านเช่ารถ
const getShopRentals = async (req, res) => {
  try {
    const shopId = req.user.id;
    
    const rentals = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year, c.image_url, u.username as customer_name, u.email as customer_email
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.customer_id = u.id
       WHERE r.shop_id = ?
       ORDER BY 
         CASE 
           WHEN r.rental_status = 'pending' THEN 1
           WHEN r.rental_status = 'confirmed' THEN 2
           WHEN r.rental_status = 'ongoing' THEN 3
           ELSE 4
         END,
         r.created_at DESC`,
      [shopId]
    );
    
    res.status(200).json({
      rentals
    });
  } catch (err) {
    console.error('Get shop rentals error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงรายละเอียดการจองสำหรับร้านเช่ารถ
const getShopRentalDetails = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const shopId = req.user.id;
    
    const [rental] = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year, c.car_type, c.transmission, c.fuel_type, 
              c.seats, c.color, c.license_plate, c.image_url, 
              u.username as customer_name, u.email as customer_email, u.phone as customer_phone, u.address as customer_address
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.customer_id = u.id
       WHERE r.id = ? AND r.shop_id = ?`,
      [rentalId, shopId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ดึงข้อมูลการชำระเงิน
    const [payment] = await db.executeQuery(
      'SELECT * FROM payments WHERE rental_id = ?',
      [rentalId]
    );
    
    rental.payment = payment;
    
    res.status(200).json({
      rental
    });
  } catch (err) {
    console.error('Get shop rental details error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อัปเดตสถานะการเช่ารถ
const updateRentalStatus = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { status } = req.body;
    const shopId = req.user.id;
    
    // ตรวจสอบว่ามีสถานะหรือไม่
    if (!status || !['confirmed', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // ตรวจสอบการเช่ารถ
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND shop_id = ?',
      [rentalId, shopId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ตรวจสอบเงื่อนไขการเปลี่ยนสถานะ
    if (rental.rental_status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({ message: 'Cannot change status of cancelled rental' });
    }
    
    if (rental.rental_status === 'completed' && status !== 'completed') {
      return res.status(400).json({ message: 'Cannot change status of completed rental' });
    }
    
    // อัปเดตสถานะการเช่า
    await db.update('rentals', rentalId, {
      rental_status: status
    });
    
    // อัปเดตสถานะรถยนต์
    const [car] = await db.executeQuery(
      'SELECT * FROM cars WHERE id = ?',
      [rental.car_id]
    );
    
    if (car) {
      let carStatus = 'available';
      
      if (status === 'confirmed' || status === 'ongoing') {
        carStatus = 'rented';
      }
      
      await db.update('cars', car.id, {
        status: carStatus
      });
    }
    
    res.status(200).json({
      message: 'Rental status updated successfully'
    });
  } catch (err) {
    console.error('Update rental status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
const getPendingRentals = async (req, res) => {
  try {
    const shopId = req.user.id;
    console.log('[getPendingRentals] Shop ID:', shopId);
    
    const rentals = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year, c.license_plate, c.image_url,
              u.username as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.customer_id = u.id
       WHERE r.shop_id = ? AND r.rental_status = 'pending'
       ORDER BY r.created_at DESC`,
      [shopId]
    );
    
    console.log('[getPendingRentals] Found rentals:', rentals.length);
    console.log('[getPendingRentals] Rentals data:', JSON.stringify(rentals, null, 2));
    
    res.status(200).json({
      rentals
    });
  } catch (err) {
    console.error('Get pending rentals error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อนุมัติการจอง (สำหรับร้านเช่ารถ)
const approveRental = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { approve } = req.body;
    const shopId = req.user.id;
    
    if (approve === undefined) {
      return res.status(400).json({ message: 'Approval status is required' });
    }
    
    // ตรวจสอบว่ามีข้อมูลการจองหรือไม่
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND shop_id = ?',
      [rentalId, shopId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ตรวจสอบว่าสถานะปัจจุบันเป็น pending หรือไม่
    if (rental.rental_status !== 'pending') {
      return res.status(400).json({ message: 'Cannot approve/reject rental that is not in pending status' });
    }
    
    // อัปเดตสถานะการจอง
    const newStatus = approve ? 'confirmed' : 'cancelled';
    
    await db.update('rentals', rentalId, {
      rental_status: newStatus
    });
    
    // ถ้าปฏิเสธการจอง อัปเดตสถานะรถเป็นพร้อมให้เช่า
    if (!approve) {
      await db.update('cars', rental.car_id, {
        status: 'available'
      });
    }
    
    // ดึงข้อมูลลูกค้าและรถยนต์ (สำหรับการส่งแจ้งเตือน)
    const [customer] = await db.executeQuery(
      'SELECT username, email FROM users WHERE id = ?',
      [rental.customer_id]
    );
    
    const [car] = await db.executeQuery(
      'SELECT brand, model, year FROM cars WHERE id = ?',
      [rental.car_id]
    );
    
    // ส่วนนี้สำหรับส่งอีเมลแจ้งเตือนลูกค้า (ถ้ามีระบบส่งอีเมล)
    // ตัวอย่างแสดง console.log เท่านั้น
    if (customer && customer.email) {
      const emailSubject = approve ? 
        'การจองรถของคุณได้รับการอนุมัติแล้ว!' : 
        'การจองรถของคุณไม่ได้รับการอนุมัติ';
      
      const emailBody = approve ?
        `เรียน ${customer.username},\n\nการจองรถ ${car.brand} ${car.model} (${car.year}) ของคุณได้รับการอนุมัติแล้ว กรุณาชำระเงินเพื่อยืนยันการจอง\n\nขอบคุณที่ใช้บริการ` :
        `เรียน ${customer.username},\n\nเราขออภัย การจองรถ ${car.brand} ${car.model} (${car.year}) ของคุณไม่ได้รับการอนุมัติ กรุณาเลือกรถคันอื่นหรือช่วงเวลาอื่น\n\nขอบคุณที่ใช้บริการ`;
      
      console.log('Email notification would be sent:', { to: customer.email, subject: emailSubject, body: emailBody });
      // ในกรณีจริง ใช้ฟังก์ชันส่งอีเมล เช่น nodemailer
      // await sendEmail(customer.email, emailSubject, emailBody);
    }
    
    res.status(200).json({
      message: approve ? 'Rental approved successfully' : 'Rental rejected successfully',
      status: newStatus
    });
    
  } catch (err) {
    console.error('Approve rental error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};






const getPendingBookings = async (req, res) => {
  try {
    const shopId = req.user.id;
    
    // ดึงข้อมูลการจองพร้อมข้อมูลการชำระเงิน
    console.log('Fetching pending bookings for shop ID:', shopId);
    
    const bookings = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year, c.license_plate, c.image_url,
              u.username as customer_name, u.email as customer_email, u.phone as customer_phone,
              p.id as payment_id, p.payment_method, p.payment_status, p.proof_image, 
              p.payment_date, p.amount
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.customer_id = u.id
       LEFT JOIN payments p ON r.id = p.rental_id
       WHERE r.shop_id = ? AND (r.rental_status = 'pending' OR p.payment_status = 'pending_verification')
       ORDER BY r.created_at DESC`,
      [shopId]
    );
    
    console.log(`Found ${bookings.length} pending bookings`);
    
    res.status(200).json({
      bookings
    });
  } catch (err) {
    console.error('Get pending bookings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// อนุมัติหรือปฏิเสธการจองและการชำระเงิน (สำหรับหน้าการแจ้งเตือนรวม)
const approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body;
    const shopId = req.user.id;
    
    console.log(`Processing booking ID: ${id}, approve: ${approve}`);
    
    // ตรวจสอบว่ามีข้อมูลการจองหรือไม่
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND shop_id = ?',
      [id, shopId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Booking not found or you do not have access' });
    }
    
    // ตรวจสอบว่ามีข้อมูลการชำระเงินหรือไม่
    const [payment] = await db.executeQuery(
      'SELECT * FROM payments WHERE rental_id = ?',
      [id]
    );
    
    let paymentStatus, rentalStatus;
    
    if (approve) {
      paymentStatus = 'paid';
      rentalStatus = 'confirmed';
    } else {
      paymentStatus = 'rejected';
      rentalStatus = 'cancelled';
    }
    
    console.log(`Updating rental status to: ${rentalStatus}, payment status to: ${paymentStatus}`);
    
    // อัปเดตสถานะการจอง
    await db.update('rentals', id, {
      rental_status: rentalStatus,
      payment_status: paymentStatus
    });
    
    // ถ้ามีข้อมูลการชำระเงิน ให้อัปเดตสถานะการชำระเงิน
    if (payment) {
      console.log(`Updating payment ID: ${payment.id}`);
      await db.update('payments', payment.id, {
        payment_status: paymentStatus,
        verified_at: new Date(),
        verified_by: shopId
      });
    }
    
    // ถ้าอนุมัติ ให้อัปเดตสถานะรถเป็นถูกเช่า
    if (approve) {
      console.log(`Updating car ID: ${rental.car_id} status to 'rented'`);
      await db.update('cars', rental.car_id, {
        status: 'rented'
      });
    }
    
    res.status(200).json({
      message: approve ? 'Booking approved successfully' : 'Booking rejected',
      status: approve ? 'approved' : 'rejected'
    });
  } catch (err) {
    console.error('Approve booking error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};








// ลูกค้าขอคืนรถ
const requestCarReturn = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const customerId = req.user.id;
    
    // ตรวจสอบการจองรถ
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND customer_id = ?',
      [rentalId, customerId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ตรวจสอบสถานะที่สามารถขอคืนรถได้
    if (rental.rental_status !== 'confirmed' && rental.rental_status !== 'ongoing') {
      return res.status(400).json({ message: 'Cannot request return for rental that is not confirmed or ongoing' });
    }
    
    // ตรวจสอบว่าได้ชำระเงินแล้วหรือยัง
    if (rental.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Cannot request return for unpaid rental' });
    }
    
    // อัปเดตสถานะการจองเป็น return_requested
    await db.update('rentals', rentalId, {
      rental_status: 'return_requested'
    });
    
    res.status(200).json({
      message: 'Car return request submitted successfully. Please wait for shop approval.'
    });
  } catch (err) {
    console.error('Request car return error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ร้านเช่ารถดูรายการขอคืนรถ
const getReturnRequests = async (req, res) => {
  try {
    const shopId = req.user.id;
    
    const returnRequests = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year, c.license_plate, c.image_url,
              u.username as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.customer_id = u.id
       WHERE r.shop_id = ? AND r.rental_status = 'return_requested'
       ORDER BY r.updated_at DESC`,
      [shopId]
    );
    
    res.status(200).json({
      returnRequests
    });
  } catch (err) {
    console.error('Get return requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ร้านเช่ารถอนุมัติการคืนรถ
const approveCarReturn = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { approve } = req.body;
    const shopId = req.user.id;
    
    if (approve === undefined) {
      return res.status(400).json({ message: 'Approval status is required' });
    }
    
    // ตรวจสอบการจองรถ
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND shop_id = ?',
      [rentalId, shopId]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ตรวจสอบสถานะปัจจุบัน
    if (rental.rental_status !== 'return_requested') {
      return res.status(400).json({ message: 'Cannot approve return for rental that is not in return_requested status' });
    }
    
    const newStatus = approve ? 'return_approved' : 'ongoing';
    
    // อัปเดตสถานะการจอง
    await db.update('rentals', rentalId, {
      rental_status: newStatus
    });
    
    // ถ้าอนุมัติการคืน ให้เปลี่ยนสถานะรถเป็น available
    if (approve) {
      await db.update('cars', rental.car_id, {
        status: 'available'
      });
    }
    
    res.status(200).json({
      message: approve ? 'Car return approved successfully' : 'Car return rejected',
      status: newStatus
    });
  } catch (err) {
    console.error('Approve car return error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRental,
  getCustomerRentals,
  getRentalDetails,
  cancelRental,
  getShopRentals,
  getShopRentalDetails,
  updateRentalStatus,
  getPendingRentals,
  approveRental,
  getPendingBookings,
  approveBooking,
  requestCarReturn,
  getReturnRequests,
  approveCarReturn
};