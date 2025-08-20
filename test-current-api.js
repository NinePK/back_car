const http = require('http');

function makeRequest(path, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function testCurrentAPI() {
  console.log('=== Testing Current Running API ===');
  
  try {
    // Test without auth first
    console.log('1. Testing /api/status...');
    const statusResult = await makeRequest('/api/status');
    console.log('Status response:', statusResult.data);
    
    // Test /api/me without token (should fail)
    console.log('\n2. Testing /api/me without token...');
    const noTokenResult = await makeRequest('/api/me');
    console.log('No token response:', noTokenResult.statusCode, noTokenResult.data);
    
    // Now we need to get a valid token by logging in
    console.log('\n3. Logging in to get token...');
    const loginPromise = new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        username: 'carshop',
        password: '123456'
      });

      const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/api/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const loginResult = await loginPromise;
    console.log('Login status:', loginResult.statusCode);
    
    if (loginResult.statusCode === 200) {
      const loginData = JSON.parse(loginResult.data);
      const token = loginData.token;
      console.log('Got token, testing /api/me...');
      
      const meResult = await makeRequest('/api/me', token);
      console.log('ME endpoint status:', meResult.statusCode);
      console.log('ME endpoint response:');
      console.log(meResult.data);
      
      if (meResult.statusCode === 200) {
        const meData = JSON.parse(meResult.data);
        console.log('\n=== ANALYSIS ===');
        console.log('User object keys:', Object.keys(meData.user || {}));
        console.log('Has promptpay_id:', 'promptpay_id' in (meData.user || {}));
        console.log('PromptPay value:', (meData.user || {}).promptpay_id);
      }
    } else {
      console.log('Login failed:', loginResult.data);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testCurrentAPI();