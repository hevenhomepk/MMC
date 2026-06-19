const axios = require('axios');

async function test(url) {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  console.log(`\n--- Testing GET ${url} ---`);
  try {
    const response = await axios.get(url, {
      params: credentials,
      headers: { 'Accept': 'application/json' },
      timeout: 5000
    });
    console.log('Success GET:', response.status, response.data);
  } catch (error) {
    console.log(`Failed GET: ${error.response?.status}`);
    console.log('GET Data:', error.response?.data);
  }

  console.log(`\n--- Testing POST ${url} ---`);
  try {
    const response = await axios.post(url, credentials, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    console.log('Success POST:', response.status, response.data);
  } catch (error) {
    console.log(`Failed POST: ${error.response?.status}`);
    console.log('POST Data:', error.response?.data);
  }
}

async function run() {
  const urls = [
    'https://devconnect.tcscourier.com/ecom/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/authentication/token'
  ];

  for (const url of urls) {
    await test(url);
  }
}

run();
