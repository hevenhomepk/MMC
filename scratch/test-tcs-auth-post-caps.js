const axios = require('axios');

async function test(url) {
  try {
    console.log(`\nTesting POST ${url}`);
    const response = await axios.post(url, {
      username: 'testenvio',
      password: '@abc123+-'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    console.log('SUCCESS!', response.status, response.data);
  } catch (error) {
    console.log(`Failed: ${error.response?.status}`);
  }
}

async function run() {
  const paths = [
    'https://devconnect.tcscourier.com/ecom/api/authentication/token',
    'https://devconnect.tcscourier.com/ecom/api/Authentication/token',
    'https://devconnect.tcscourier.com/ecom/api/authentication/Token',
    'https://devconnect.tcscourier.com/ecom/api/Authentication/Token',
    'https://devconnect.tcscourier.com/ecom/api/auth/token',
    'https://devconnect.tcscourier.com/ecom/api/Auth/token',
    'https://devconnect.tcscourier.com/ecom/api/token',
    'https://devconnect.tcscourier.com/ecom/api/Token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/Authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/Token',
    'https://ociconnect.tcscourier.com/ecom/api/Authentication/Token',
    'https://ociconnect.tcscourier.com/ecom/api/auth/token',
    'https://ociconnect.tcscourier.com/ecom/api/Auth/token',
    'https://ociconnect.tcscourier.com/ecom/api/token',
    'https://ociconnect.tcscourier.com/ecom/api/Token'
  ];

  for (const p of paths) {
    await test(p);
  }
}

run();
