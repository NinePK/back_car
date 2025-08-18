const mysql = require('mysql2/promise');

async function updateDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('Connected to database successfully');
    
    // Update rental_status enum to include new values
    console.log('Updating rental_status enum...');
    await connection.query(`
      ALTER TABLE rentals 
      MODIFY COLUMN rental_status ENUM('pending','confirmed','ongoing','completed','cancelled','return_requested','return_approved') 
      NOT NULL DEFAULT 'pending'
    `);
    console.log('✅ Updated rental_status enum successfully');
    
    // Fix any empty rental_status values
    console.log('Fixing empty rental_status values...');
    const [result] = await connection.query(`
      UPDATE rentals 
      SET rental_status = 'confirmed' 
      WHERE rental_status = '' OR rental_status IS NULL
    `);
    console.log(`✅ Fixed ${result.affectedRows} empty rental_status values`);
    
    // Verify the changes
    const [columns] = await connection.query("SHOW COLUMNS FROM rentals WHERE Field='rental_status'");
    console.log('\n✅ Updated rental_status column info:');
    console.log(columns[0]);
    
    // Show rentals that can be used for testing
    const [testableRentals] = await connection.query(`
      SELECT id, rental_status, payment_status, customer_id, shop_id, 
             CONCAT(c.brand, ' ', c.model) as car_name,
             u.username as customer_name
      FROM rentals r
      JOIN cars c ON r.car_id = c.id  
      JOIN users u ON r.customer_id = u.id
      WHERE r.payment_status = 'paid' 
      AND r.rental_status IN ('confirmed', 'ongoing')
      ORDER BY r.id DESC
    `);
    
    console.log('\n📋 Rentals ready for testing car return:');
    if (testableRentals.length > 0) {
      console.log(testableRentals);
      console.log(`\n🎯 You can test with rental ID: ${testableRentals[0].id}`);
    } else {
      console.log('❌ No rentals found with status "confirmed" or "ongoing" and payment "paid"');
      console.log('💡 You need to:');
      console.log('   1. Create a booking');
      console.log('   2. Shop approves the booking');
      console.log('   3. Customer pays');
      console.log('   4. Shop approves the payment');
      console.log('   Then you can test car return');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

updateDatabase();