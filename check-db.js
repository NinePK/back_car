const mysql = require('mysql2/promise');

async function checkDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('Connected to database successfully');
    
    // Check rental_status enum
    const [columns] = await connection.query("SHOW COLUMNS FROM rentals WHERE Field='rental_status'");
    console.log('\nrental_status column info:');
    console.log(columns[0]);
    
    // Check existing rentals
    const [rentals] = await connection.query("SELECT id, rental_status, payment_status, customer_id, shop_id FROM rentals ORDER BY id DESC LIMIT 5");
    console.log('\nRecent rentals:');
    console.log(rentals);
    
    // Check for any return_requested status
    const [returnRequests] = await connection.query("SELECT COUNT(*) as count FROM rentals WHERE rental_status = 'return_requested'");
    console.log('\nReturn requests count:');
    console.log(returnRequests[0]);
    
    await connection.end();
    
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

checkDatabase();