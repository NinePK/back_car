// Simple debug script to test the exact same logic as the /me endpoint

const mysql = require('mysql2/promise');

async function debugMeEndpoint() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('=== Debugging /me endpoint logic ===');
    
    const userId = 8; // Shop account ID
    
    // Step 1: Check if promptpay_id column exists (same as controller)
    console.log('Step 1: Checking if promptpay_id column exists...');
    const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    console.log('Column check result:', columns.length > 0 ? 'EXISTS' : 'NOT EXISTS');
    
    // Step 2: Build query (same logic as controller)
    let query;
    if (columns.length > 0) {
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, promptpay_id, created_at ' +
              'FROM users WHERE id = ?';
    } else {
      query = 'SELECT id, username, email, role, phone, address, profile_image, ' +
              'status, shop_name, shop_description, created_at ' +
              'FROM users WHERE id = ?';
    }
    
    console.log('Step 2: Query built:', query);
    
    // Step 3: Execute query
    console.log('Step 3: Executing query...');
    const result = await connection.query(query, [userId]);
    
    console.log('Raw MySQL result:', typeof result, Array.isArray(result));
    console.log('Result structure:', result.map(r => typeof r));
    
    // This is what our executeQuery returns (first element of the array)
    const executeQueryResult = result[0];
    console.log('executeQuery would return:', typeof executeQueryResult, Array.isArray(executeQueryResult));
    console.log('executeQuery length:', executeQueryResult.length);
    
    // This is what controller does: const [user] = await db.executeQuery(query, [userId]);
    // After our fix: const users = await db.executeQuery(query, [userId]); const user = users[0];
    const users = executeQueryResult; // This is what executeQuery returns
    const user = users[0]; // This is what we get
    
    console.log('Step 4: Final user object:');
    console.log('User type:', typeof user);
    console.log('User keys:', user ? Object.keys(user) : 'NULL');
    console.log('Has promptpay_id:', user ? ('promptpay_id' in user) : 'N/A');
    console.log('PromptPay value:', user ? user.promptpay_id : 'N/A');
    console.log('Full user object:', JSON.stringify(user, null, 2));
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugMeEndpoint();