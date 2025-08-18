// ทดสอบ API โดยตรงโดยไม่ผ่าน HTTP
const rentalController = require('./controllers/rental.controller');
const paymentController = require('./controllers/payment.controller');

// จำลอง req และ res objects
const createMockReqRes = (userId = 1, role = 'shop') => {
  const req = {
    user: { id: userId, role: role },
    params: {},
    body: {},
    headers: {}
  };
  
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      console.log(`Response ${this.statusCode}:`, JSON.stringify(data, null, 2));
      return this;
    },
    statusCode: 200,
    data: null
  };
  
  return { req, res };
};

const testControllerDirectly = async () => {
  console.log('=== ทดสอบ Controller โดยตรง ===\n');
  
  try {
    // ทดสอบ getPendingRentals
    console.log('1. ทดสอบ getPendingRentals...');
    const { req: req1, res: res1 } = createMockReqRes(1, 'shop');
    await rentalController.getPendingRentals(req1, res1);
    
    console.log('\n2. ทดสอบ getPendingBookings...');
    const { req: req2, res: res2 } = createMockReqRes(1, 'shop');
    await rentalController.getPendingBookings(req2, res2);
    
    console.log('\n3. ทดสอบ getPendingPayments...');
    const { req: req3, res: res3 } = createMockReqRes(1, 'shop');
    await paymentController.getPendingPayments(req3, res3);
    
    // ทดสอบกับ shop ID 3
    console.log('\n4. ทดสอบกับ Shop ID 3...');
    const { req: req4, res: res4 } = createMockReqRes(3, 'shop');
    await rentalController.getPendingBookings(req4, res4);
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
  }
};

testControllerDirectly();