const axios = require('axios');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const urls = [
    'https://devconnect.tcscourier.com/ecom/api/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token'
  ];

  const capitalizations = [
    { username: 'Username', password: 'Password' },
    { username: 'username', password: 'password' },
    { username: 'UserName', password: 'Password' },
    { username: 'userName', password: 'password' },
    { username: 'USER', password: 'PASSWORD' },
    { username: 'user', password: 'password' }
  ];

  for (const url of urls) {
    for (const cap of capitalizations) {
      const params = {};
      params[cap.username] = credentials.username;
      params[cap.password] = credentials.password;

      console.log(`\n--- Testing GET ${url} with params keys: ${Object.keys(params).join(', ')} ---`);
      try {
        const response = await axios.get(url, {
          params,
          headers: { 'Accept': 'application/json' },
          timeout: 5000
        });
        console.log('Success:', response.status, response.data);
      } catch (error) {
        console.log(`Failed: ${error.response?.status}`);
        console.log('Data:', error.response?.data);
      }
    }
  }
}

test();
