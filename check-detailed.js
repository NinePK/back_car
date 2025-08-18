const mysql = require('mysql2/promise');

async function checkDetailed() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    console.log('Connected to database successfully');
    
    // Get actual rental data for car ID 3
    const [carRentals] = await connection.query(`
      SELECT id, car_id, rental_status, start_date, end_date
      FROM rentals 
      WHERE car_id = 3
      ORDER BY id DESC
    `);
    
    console.log('\n📋 All rentals for Car ID 3:');
    carRentals.forEach(rental => {
      console.log(`Rental ID: ${rental.id}, Status: ${rental.rental_status}, Dates: ${rental.start_date} to ${rental.end_date}`);
    });
    
    // Test with realistic overlapping dates
    if (carRentals.length > 0) {
      const testRental = carRentals[0];
      const test_start = testRental.start_date;
      const test_end = testRental.end_date;
      
      console.log(`\n🧪 Testing with overlapping dates: ${test_start} to ${test_end}`);
      
      // Old logic (before fix) - would consider return_approved as conflict
      const [oldLogicConflicts] = await connection.query(`
        SELECT id, rental_status FROM rentals 
        WHERE car_id = 3
        AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date) OR (? BETWEEN start_date AND end_date))
        AND rental_status NOT IN ('cancelled', 'completed')
      `, [test_start, test_end, test_start, test_end, test_start, test_end]);
      
      // New logic (after fix) - excludes return_approved from conflicts
      const [newLogicConflicts] = await connection.query(`
        SELECT id, rental_status FROM rentals 
        WHERE car_id = 3
        AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date) OR (? BETWEEN start_date AND end_date))
        AND rental_status NOT IN ('cancelled', 'completed', 'return_approved')
      `, [test_start, test_end, test_start, test_end, test_start, test_end]);
      
      console.log('\n📊 Conflict Detection Results:');
      console.log('Old logic conflicts:');
      oldLogicConflicts.forEach(c => console.log(`  - Rental ${c.id} (${c.rental_status})`));
      
      console.log('New logic conflicts:');
      newLogicConflicts.forEach(c => console.log(`  - Rental ${c.id} (${c.rental_status})`));
      
      console.log(`\nOld logic would find ${oldLogicConflicts.length} conflicts`);
      console.log(`New logic finds ${newLogicConflicts.length} conflicts`);
      
      if (oldLogicConflicts.length > newLogicConflicts.length) {
        console.log('\n✅ SUCCESS: Fix is working! Return-approved rentals are no longer blocking new bookings.');
      } else {
        console.log('\n⚠️  No difference detected. This might be because there are no return_approved rentals with overlapping dates.');
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

checkDetailed();