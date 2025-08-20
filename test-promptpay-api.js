const axios = require('axios');

async function testPromptPayAPI() {
  try {
    // First, login to get a token for the shop account
    console.log('Logging in as shop account...');
    const loginResponse = await axios.post('http://localhost:8000/api/login', {
      username: 'carshop',
      password: 'carshop123'
    });

    const token = loginResponse.data.token;
    console.log('Login successful, token received');

    // Then get profile data
    console.log('\nFetching profile data...');
    const profileResponse = await axios.get('http://localhost:8000/api/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const userData = profileResponse.data.user;
    console.log('\nProfile data received:');
    console.log('ID:', userData.id);
    console.log('Username:', userData.username);
    console.log('Shop name:', userData.shop_name);
    console.log('PromptPay ID:', userData.promptpay_id);
    console.log('PromptPay ID type:', typeof userData.promptpay_id);
    console.log('\nFull user data:');
    console.log(JSON.stringify(userData, null, 2));

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

testPromptPayAPI();