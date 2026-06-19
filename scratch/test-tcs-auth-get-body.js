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

  for (const url of urls) {
    console.log(`\n--- Testing GET with JSON body on ${url} ---`);
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        data: credentials,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      console.log(`Status: ${response.status}`);
      console.log('Data:', response.data);
    } catch (error) {
      console.log(`Status: ${error.response?.status}`);
      console.log('Error Data:', error.response?.data);
      console.log('Error Message:', error.message);
    }
  }
}

test();
