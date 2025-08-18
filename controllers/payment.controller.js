// server/controllers/payment.controller.js
const db = require('../models/db');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const promptPayQR = require('promptpay-qr');

// ดึงข้อมูลสำหรับชำระเงิน
// server/controllers/payment.controller.js
const getPaymentInfo = async (req, res) => {
    try {
      const { rentalId } = req.params;
      
      console.log('กำลังดึงข้อมูลการชำระเงินสำหรับการจอง ID:', rentalId);
      
      // ดึงข้อมูลการจอง
      const [rental] = await db.executeQuery(
        `SELECT r.*, c.brand, c.model, c.year, c.image_url,
                u.shop_name, u.promptpay_id as shop_promptpay_id
         FROM rentals r
         JOIN cars c ON r.car_id = c.id
         JOIN users u ON r.shop_id = u.id
         WHERE r.id = ? AND r.customer_id = ?`,
        [rentalId, req.user.id]
      );
      
      if (!rental) {
        console.log('ไม่พบข้อมูลการจองหรือลูกค้าไม่มีสิทธิ์เข้าถึง');
        return res.status(404).json({ message: 'ไม่พบข้อมูลการจองหรือคุณไม่มีสิทธิ์เข้าถึง' });
      }
      
      console.log('พบข้อมูลการจอง:', rental);
      
      // ตรวจสอบการมีอยู่ของ promptpay_id
      const promptpayId = rental.shop_promptpay_id;
      console.log('PromptPay ID ของร้าน:', promptpayId);
      
      if (!promptpayId) {
        console.log('ไม่พบข้อมูล PromptPay สำหรับร้านเช่ารถนี้');
        return res.status(400).json({ message: 'ไม่พบข้อมูล PromptPay สำหรับร้านเช่ารถนี้ กรุณาติดต่อผู้ดูแลระบบ' });
      }
      
      // คำนวณจำนวนวัน
      const startDate = new Date(rental.start_date);
      const endDate = new Date(rental.end_date);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // ตรวจสอบว่ามีข้อมูลการชำระเงินแล้วหรือไม่
      const [payment] = await db.executeQuery(
        'SELECT * FROM payments WHERE rental_id = ?',
        [rentalId]
      );
      
      console.log('ข้อมูลการชำระเงินที่มีอยู่:', payment);
      
      // ถ้ายังไม่มีข้อมูลการชำระเงิน ให้ข้ามส่วนนี้ เพราะอาจเกิดปัญหาเรื่องโครงสร้างตาราง
      // เราจะแค่ส่งข้อมูลที่จำเป็นต่อการชำระเงินกลับไป โดยไม่พยายามสร้างข้อมูลการชำระเงินใหม่
      
      // สามารถลองสร้างข้อมูลการจ่ายเงินถ้าต้องการ แต่ถ้าเกิดปัญหาจะข้ามไป
      if (!payment) {
        console.log('ไม่พบข้อมูลการชำระเงิน ข้ามการสร้างข้อมูลการชำระเงินใหม่');
      }
      
      // ส่งข้อมูลการชำระเงินกลับไป
      res.status(200).json({
        rental: {
          id: rental.id,
          car_id: rental.car_id,
          start_date: rental.start_date,
          end_date: rental.end_date,
          total_amount: rental.total_amount,
          days: days,
          brand: rental.brand,
          model: rental.model,
          year: rental.year,
          image_url: rental.image_url
        },
        shop_name: rental.shop_name,
        promptpay_id: promptpayId,
        total_amount: rental.total_amount
      });
      
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน:', err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์: ' + err.message });
    }
  };
  
// อัปโหลดหลักฐานการชำระเงิน
const uploadPaymentProof = async (req, res) => {
  try {
    const { rentalId } = req.params;
    
    // ตรวจสอบว่ามีไฟล์หรือไม่
    if (!req.file) {
      return res.status(400).json({ message: 'Payment proof image is required' });
    }
    
    // สร้าง URL ของไฟล์
    const proofImageUrl = `/uploads/payments/${req.file.filename}`;
    
    // ตรวจสอบว่ามีข้อมูลการจองหรือไม่
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND customer_id = ?',
      [rentalId, req.user.id]
    );
    
    if (!rental) {
      // ลบไฟล์ที่อัปโหลดถ้าไม่พบข้อมูลการจอง
      fs.unlinkSync(path.join(__dirname, '../../uploads/payments', req.file.filename));
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // อัปเดตข้อมูลการชำระเงิน
    const [payment] = await db.executeQuery(
      'SELECT * FROM payments WHERE rental_id = ?',
      [rentalId]
    );
    
    if (payment) {
      // อัปเดตข้อมูลการชำระเงิน
      await db.update('payments', payment.id, {
        payment_status: 'pending_verification',
        proof_image: proofImageUrl,
        payment_date: new Date()
      });
    } else {
      // สร้างข้อมูลการชำระเงินใหม่
      await db.create('payments', {
        rental_id: rentalId,
        amount: rental.total_amount,
        payment_status: 'pending_verification',
        payment_method: 'promptpay',
        proof_image: proofImageUrl,
        payment_date: new Date()
      });
    }
    
    // อัปเดตสถานะการชำระเงินในการจอง
    await db.update('rentals', rentalId, {
      payment_status: 'pending_verification'
    });
    
    res.status(200).json({
      message: 'Payment proof uploaded successfully',
      redirect_to: `/customer/bookings/${rentalId}`
    });
    
  } catch (err) {
    console.error('Upload payment proof error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ยืนยันการชำระเงิน (สำหรับร้านเช่ารถ)
const verifyPayment = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { approve } = req.body;
    
    if (approve === undefined) {
      return res.status(400).json({ message: 'Approval status is required' });
    }
    
    // ตรวจสอบว่ามีข้อมูลการจองหรือไม่
    const [rental] = await db.executeQuery(
      'SELECT * FROM rentals WHERE id = ? AND shop_id = ?',
      [rentalId, req.user.id]
    );
    
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or you do not have access' });
    }
    
    // ตรวจสอบว่ามีข้อมูลการชำระเงินหรือไม่
    const [payment] = await db.executeQuery(
      'SELECT * FROM payments WHERE rental_id = ?',
      [rentalId]
    );
    
    if (!payment || payment.payment_status !== 'pending_verification') {
      return res.status(400).json({ message: 'No pending payment verification found' });
    }
    
    // อัปเดตสถานะการชำระเงินและการจอง
    let paymentStatus, rentalStatus;
    
    if (approve) {
      paymentStatus = 'paid';
      rentalStatus = 'confirmed';
    } else {
      paymentStatus = 'rejected';
      rentalStatus = 'pending';
    }
    
    // อัปเดตข้อมูลการชำระเงิน
    await db.update('payments', payment.id, {
      payment_status: paymentStatus,
      verified_at: new Date(),
      verified_by: req.user.id
    });
    
    // อัปเดตสถานะการจอง
    await db.update('rentals', rentalId, {
      payment_status: paymentStatus,
      rental_status: rentalStatus
    });
    
    // ถ้าอนุมัติ ให้อัปเดตสถานะรถเป็นถูกเช่า
    if (approve) {
      await db.update('cars', rental.car_id, {
        status: 'rented'
      });
    }
    
    res.status(200).json({
      message: approve ? 'Payment approved successfully' : 'Payment rejected',
      status: approve ? 'approved' : 'rejected'
    });
    
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงข้อมูลการชำระเงินที่รอการยืนยัน (สำหรับร้านเช่ารถ)
const getPendingPayments = async (req, res) => {
  try {
    const shopId = req.user.id;
    
    // ดึงข้อมูลการชำระเงินที่รอการยืนยัน
    const payments = await db.executeQuery(
      `SELECT p.*, r.car_id, r.customer_id, r.start_date, r.end_date, r.total_amount,
              c.brand, c.model, c.year, c.license_plate, c.image_url,
              u.username as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM payments p
       JOIN rentals r ON p.rental_id = r.id
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.customer_id = u.id
       WHERE r.shop_id = ? AND p.payment_status = 'pending_verification'
       ORDER BY p.payment_date DESC`,
      [shopId]
    );
    
    res.status(200).json({
      payments
    });
    
  } catch (err) {
    console.error('Get pending payments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ดึงประวัติการชำระเงิน (สำหรับร้านเช่ารถ)
const getPaymentHistory = async (req, res) => {
  try {
    const shopId = req.user.id;
    const { status } = req.query;
    
    let query = `
      SELECT p.*, r.car_id, r.customer_id, r.start_date, r.end_date, r.total_amount,
             c.brand, c.model, c.year, c.license_plate, c.image_url,
             u.username as customer_name, u.email as customer_email, u.phone as customer_phone
      FROM payments p
      JOIN rentals r ON p.rental_id = r.id
      JOIN cars c ON r.car_id = c.id
      JOIN users u ON r.customer_id = u.id
      WHERE r.shop_id = ?`;
    
    const params = [shopId];
    
    // กรองตามสถานะถ้ามีการระบุ
    if (status) {
      query += ` AND p.payment_status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY p.payment_date DESC`;
    
    const payments = await db.executeQuery(query, params);
    
    res.status(200).json({
      payments
    });
    
  } catch (err) {
    console.error('Get payment history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// สร้าง QR Code PromptPay
const generatePromptPayQR = async (req, res) => {
  try {
    const { rentalId } = req.params;
    
    console.log('กำลังสร้าง QR Code PromptPay สำหรับการจอง ID:', rentalId);
    
    // ดึงข้อมูลการจอง
    const [rental] = await db.executeQuery(
      `SELECT r.*, c.brand, c.model, c.year,
              u.shop_name, u.promptpay_id as shop_promptpay_id
       FROM rentals r
       JOIN cars c ON r.car_id = c.id
       JOIN users u ON r.shop_id = u.id
       WHERE r.id = ? AND r.customer_id = ?`,
      [rentalId, req.user.id]
    );
    
    if (!rental) {
      console.log('ไม่พบข้อมูลการจองหรือลูกค้าไม่มีสิทธิ์เข้าถึง');
      return res.status(404).json({ message: 'ไม่พบข้อมูลการจองหรือคุณไม่มีสิทธิ์เข้าถึง' });
    }
    
    // ตรวจสอบการมีอยู่ของ promptpay_id
    const promptpayId = rental.shop_promptpay_id;
    console.log('PromptPay ID ของร้าน:', promptpayId);
    
    if (!promptpayId) {
      console.log('ไม่พบข้อมูล PromptPay สำหรับร้านเช่ารถนี้');
      return res.status(400).json({ message: 'ไม่พบข้อมูล PromptPay สำหรับร้านเช่ารถนี้' });
    }
    
    // สร้าง PromptPay payload
    const amount = parseFloat(rental.total_amount);
    const payload = promptPayQR(promptpayId, { amount });
    
    console.log('PromptPay payload:', payload);
    
    // สร้าง QR Code
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
    
    console.log('สร้าง QR Code สำเร็จ');
    
    res.status(200).json({
      qr_code: qrCodeDataURL,
      promptpay_id: promptpayId,
      amount: amount,
      shop_name: rental.shop_name,
      rental_info: {
        id: rental.id,
        brand: rental.brand,
        model: rental.model,
        year: rental.year,
        start_date: rental.start_date,
        end_date: rental.end_date
      }
    });
    
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการสร้าง QR Code:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์: ' + err.message });
  }
};

module.exports = {
  getPaymentInfo,
  uploadPaymentProof,
  verifyPayment,
  getPendingPayments,
  getPaymentHistory,
  generatePromptPayQR
};