const mysql = require('mysql2/promise');

async function checkTestableData() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('Connected to database successfully');
    
    // Show all rentals with details
    const [allRentals] = await connection.query(`
      SELECT r.id, r.rental_status, r.payment_status, 
             r.customer_id, r.shop_id,
             c.brand, c.model, c.year,
             u.username as customer_name
      FROM rentals r
      JOIN cars c ON r.car_id = c.id  
      JOIN users u ON r.customer_id = u.id
      ORDER BY r.id DESC
    `);
    
    console.log('\n📋 All rentals in system:');
    allRentals.forEach(rental => {
      console.log(`ID: ${rental.id}, Status: ${rental.rental_status}, Payment: ${rental.payment_status}, Car: ${rental.brand} ${rental.model}, Customer: ${rental.customer_name}`);
    });
    
    // Find rentals ready for return testing
    const testableRentals = allRentals.filter(r => 
      r.payment_status === 'paid' && 
      (r.rental_status === 'confirmed' || r.rental_status === 'ongoing')
    );
    
    console.log('\n🎯 Rentals ready for return testing:');
    if (testableRentals.length > 0) {
      testableRentals.forEach(rental => {
        console.log(`✅ Rental ID ${rental.id}: ${rental.brand} ${rental.model} - Customer: ${rental.customer_name}`);
      });
    } else {
      console.log('❌ No rentals ready for testing');
      console.log('\n💡 To create testable data:');
      console.log('1. Login as customer and book a car');
      console.log('2. Login as shop and approve the booking');  
      console.log('3. Customer makes payment');
      console.log('4. Shop approves the payment');
      console.log('5. Now rental status should be "confirmed" and ready for return testing');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

checkTestableData();