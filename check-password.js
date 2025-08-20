const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkPassword() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'car_rental'
    });

    const [users] = await connection.query('SELECT username, password FROM users WHERE username = ?', ['carshop']);
    
    if (users.length > 0) {
      const user = users[0];
      console.log('Username:', user.username);
      console.log('Stored password hash:', user.password);
      
      // Try common passwords
      const testPasswords = ['carshop123', '123456', 'password', 'carshop'];
      
      for (const pwd of testPasswords) {
        try {
          const match = await bcrypt.compare(pwd, user.password);
          console.log(`Testing "${pwd}":`, match ? 'MATCH' : 'NO MATCH');
        } catch (e) {
          console.log(`Testing "${pwd}": ERROR -`, e.message);
        }
      }
    } else {
      console.log('User not found');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPassword();