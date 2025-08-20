const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestCustomer() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('Creating test customer...');
    
    // Check if customer already exists
    const [existing] = await connection.query('SELECT id FROM users WHERE username = ?', ['testcustomer']);
    
    if (existing.length > 0) {
      console.log('Test customer already exists with ID:', existing[0].id);
      
      // Update with PromptPay
      await connection.query('UPDATE users SET promptpay_id = ? WHERE username = ?', ['0812345678', 'testcustomer']);
      console.log('Updated test customer with PromptPay: 0812345678');
      
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash('customer123', 10);
      
      // Create customer
      const [result] = await connection.query(`
        INSERT INTO users (username, email, password, role, phone, address, promptpay_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        'testcustomer',
        'customer@test.com',
        hashedPassword,
        'customer',
        '0812345678',
        'Bangkok, Thailand',
        '0812345678'
      ]);
      
      console.log('Created test customer with ID:', result.insertId);
      console.log('Username: testcustomer');
      console.log('Password: customer123');
      console.log('PromptPay: 0812345678');
    }
    
    // Verify
    const [customer] = await connection.query('SELECT * FROM users WHERE username = ?', ['testcustomer']);
    if (customer.length > 0) {
      console.log('\nCustomer data:');
      console.log('ID:', customer[0].id);
      console.log('Username:', customer[0].username);
      console.log('Email:', customer[0].email);
      console.log('Role:', customer[0].role);
      console.log('Phone:', customer[0].phone);
      console.log('Address:', customer[0].address);
      console.log('PromptPay ID:', customer[0].promptpay_id);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestCustomer();