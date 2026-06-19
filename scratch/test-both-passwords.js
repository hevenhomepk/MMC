const axios = require('axios');

async function test(url, username, password) {
  try {
    console.log(`\nTesting ${url} with ${username} / ${password}`);
    const response = await axios.get(url, {
      params: { username, password },
      headers: { 'Accept': 'application/json' },
      timeout: 5000
    });
    console.log('SUCCESS!');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    return true;
  } catch (error) {
    console.log(`Failed: ${error.response?.status}`);
    console.log('Data:', error.response?.data);
    return false;
  }
}

async function run() {
  const urls = [
    'https://devconnect.tcscourier.com/ecom/api/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token'
  ];

  const credentials = [
    { username: 'testenvio', password: '@abc123+-' },
    { username: 'testenvio', password: 'abc123+' }
  ];

  for (const url of urls) {
    for (const cred of credentials) {
      await test(url, cred.username, cred.password);
    }
  }
}

run();
