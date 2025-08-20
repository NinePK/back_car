const mysql = require('mysql2/promise');

async function testMeEndpoint() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('=== Testing /me endpoint logic ===');
    
    // Simulate what the /me endpoint does
    const userId = 8; // The shop account ID we found earlier
    
    // Check if promptpay_id column exists (same logic as in auth controller)
    const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    console.log('PromptPay column exists:', columns.length > 0);
    
    // Build query the same way as the backend
    let query;
    if (columns.length > 0) {
      // If promptpay_id column exists
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, promptpay_id, created_at ' +
              'FROM users WHERE id = ?';
    } else {
      // If promptpay_id column doesn't exist
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, created_at ' +
              'FROM users WHERE id = ?';
    }
    
    console.log('Query being used:', query);
    
    const [result] = await connection.query(query, [userId]);
    
    console.log('=== Query Results ===');
    if (result.length > 0) {
      const user = result[0];
      console.log('User found:', user.username);
      console.log('Shop name:', user.shop_name);
      console.log('PromptPay ID:', user.promptpay_id);
      console.log('PromptPay ID type:', typeof user.promptpay_id);
      console.log('Full user object:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('No user found with ID:', userId);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMeEndpoint();