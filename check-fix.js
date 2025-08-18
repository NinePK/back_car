const mysql = require('mysql2/promise');

async function checkFix() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('Connected to database successfully');
    
    // Check cars with available status
    const [availableCars] = await connection.query(`
      SELECT id, brand, model, status 
      FROM cars 
      WHERE status = 'available'
      ORDER BY id
    `);
    
    console.log('\n🚗 Available cars:');
    availableCars.forEach(car => {
      console.log(`Car ID: ${car.id}, ${car.brand} ${car.model}, Status: ${car.status}`);
    });
    
    // Check return_approved rentals
    const [returnApproved] = await connection.query(`
      SELECT r.id, r.car_id, r.rental_status, c.brand, c.model, c.status as car_status
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      WHERE r.rental_status = 'return_approved'
      ORDER BY r.id DESC
    `);
    
    console.log('\n✅ Return approved rentals:');
    returnApproved.forEach(rental => {
      console.log(`Rental ID: ${rental.id}, Car: ${rental.brand} ${rental.model}, Car Status: ${rental.car_status}`);
    });
    
    // Simulate the old logic (before fix)
    const car_id = 3; // Example car ID
    const start_date = '2024-01-01';
    const end_date = '2024-01-05';
    
    const [oldLogicConflicts] = await connection.query(`
      SELECT * FROM rentals 
      WHERE car_id = ? 
      AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date) OR (? BETWEEN start_date AND end_date))
      AND rental_status NOT IN ('cancelled', 'completed')
    `, [car_id, start_date, end_date, start_date, end_date, start_date, end_date]);
    
    // Simulate the new logic (after fix)
    const [newLogicConflicts] = await connection.query(`
      SELECT * FROM rentals 
      WHERE car_id = ? 
      AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date) OR (? BETWEEN start_date AND end_date))
      AND rental_status NOT IN ('cancelled', 'completed', 'return_approved')
    `, [car_id, start_date, end_date, start_date, end_date, start_date, end_date]);
    
    console.log(`\n🔍 Conflict check for Car ID ${car_id}:`);
    console.log(`Old logic conflicts: ${oldLogicConflicts.length}`);
    console.log(`New logic conflicts: ${newLogicConflicts.length}`);
    
    if (oldLogicConflicts.length > newLogicConflicts.length) {
      console.log('✅ Fix successful! The new logic excludes return_approved rentals from conflicts.');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

checkFix();