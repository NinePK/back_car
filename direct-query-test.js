// Test the exact same logic as the controller
const db = require('./models/db');

async function testDirectQuery() {
  try {
    console.log('=== Testing Direct Query ===');
    
    const userId = 8;
    
    // Step 1: Check if promptpay_id column exists (same as controller)
    console.log('Step 1: Checking column...');
    const columns = await db.executeQuery("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    console.log('Column check result:', columns);
    console.log('Columns length:', columns.length);
    
    // Step 2: Build query (same logic as controller)
    let query;
    if (columns.length > 0) {
      // If promptpay_id column exists
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, promptpay_id, created_at ' +
              'FROM users WHERE id = ?';
      console.log('Using query WITH promptpay_id');
    } else {
      // If promptpay_id column doesn't exist
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, created_at ' +
              'FROM users WHERE id = ?';
      console.log('Using query WITHOUT promptpay_id');
    }
    
    console.log('Query:', query);
    
    // Step 3: Execute query through our db module
    console.log('Step 3: Executing through db.executeQuery...');
    const users = await db.executeQuery(query, [userId]);
    console.log('executeQuery result type:', typeof users);
    console.log('executeQuery result length:', users.length);
    console.log('First user:', users[0]);
    
    const user = users[0];
    console.log('Final user keys:', user ? Object.keys(user) : 'NO USER');
    console.log('Final user promptpay_id:', user?.promptpay_id);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDirectQuery();