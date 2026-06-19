const axios = require('axios');

async function test(url, data) {
  try {
    console.log(`\nTesting GET with body on ${url}`);
    console.log('Sending Body:', JSON.stringify(data));
    const response = await axios({
      method: 'GET',
      url: url,
      data: data,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    console.log('SUCCESS!', response.status);
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

  const bodies = [
    { clientid: 'testenvio', clientsecret: '@abc123+-' },
    { username: 'testenvio', password: '@abc123+-' },
    { clientid: 'testenvio', clientsecret: 'abc123+' },
    { username: 'testenvio', password: 'abc123+' }
  ];

  for (const url of urls) {
    for (const body of bodies) {
      await test(url, body);
    }
  }
}

run();
