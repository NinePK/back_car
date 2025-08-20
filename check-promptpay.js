const mysql = require('mysql2/promise');

async function checkPromptPay() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('Connected to database successfully');
    
    // Check if promptpay_id column exists
    const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'promptpay_id'");
    console.log('\nPromptPay column exists:', columns.length > 0);
    if (columns.length > 0) {
      console.log('Column info:', columns[0]);
    }
    
    // Check shop accounts and their promptpay_id values
    const [shops] = await connection.query(`
      SELECT id, username, shop_name, promptpay_id, created_at,
             CASE 
               WHEN promptpay_id IS NULL THEN 'NULL'
               WHEN promptpay_id = '' THEN 'EMPTY_STRING'
               ELSE 'HAS_VALUE'
             END as promptpay_status
      FROM users 
      WHERE role = 'shop' 
      ORDER BY id DESC LIMIT 10
    `);
    
    console.log('\nShop accounts and PromptPay status:');
    console.table(shops);
    
    // Count shop accounts by promptpay status
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_shops,
        SUM(CASE WHEN promptpay_id IS NOT NULL AND promptpay_id != '' THEN 1 ELSE 0 END) as has_promptpay,
        SUM(CASE WHEN promptpay_id IS NULL THEN 1 ELSE 0 END) as null_promptpay,
        SUM(CASE WHEN promptpay_id = '' THEN 1 ELSE 0 END) as empty_promptpay
      FROM users WHERE role = 'shop'
    `);
    
    console.log('\nShop PromptPay statistics:');
    console.table(stats);
    
    await connection.end();
    
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

checkPromptPay();