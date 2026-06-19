const axios = require('axios');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const urls = [
    'https://devconnect.tcscourier.com/ecom/api/authentication/token',
    'https://devconnect.tcscourier.com/ecom/api/token',
    'https://devconnect.tcscourier.com/ecom/token',
    'https://devconnect.tcscourier.com/token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/token',
    'https://ociconnect.tcscourier.com/ecom/token',
    'https://ociconnect.tcscourier.com/token'
  ];

  for (const url of urls) {
    console.log(`\nTesting POST ${url}`);
    try {
      const response = await axios.post(url, credentials, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 4000
      });
      console.log(`Success: ${response.status}`, response.data);
    } catch (e) {
      console.log(`Failed: ${e.response?.status} - ${e.message}`, e.response?.data);
    }

    console.log(`Testing GET ${url}`);
    try {
      const response = await axios.get(url, {
        params: credentials,
        headers: {
          'Accept': 'application/json'
        },
        timeout: 4000
      });
      console.log(`Success: ${response.status}`, response.data);
    } catch (e) {
      console.log(`Failed: ${e.response?.status} - ${e.message}`, e.response?.data);
    }
  }
}

test();
