const axios = require('axios');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const urls = [
    'https://devconnect.tcscourier.com/auth/api/token',
    'https://ociconnect.tcscourier.com/auth/api/token'
  ];

  for (const url of urls) {
    console.log(`\n--- Testing POST on ${url} ---`);
    try {
      const response = await axios.post(url, credentials, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      console.log(`Status: ${response.status}`);
      console.log('Data:', response.data);
    } catch (error) {
      console.log(`Failed: ${error.response?.status}`);
      console.log('Data:', error.response?.data);
    }

    console.log(`\n--- Testing POST with clientid/clientsecret on ${url} ---`);
    try {
      const response = await axios.post(url, {
        clientid: credentials.username,
        clientsecret: credentials.password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      console.log(`Status: ${response.status}`);
      console.log('Data:', response.data);
    } catch (error) {
      console.log(`Failed: ${error.response?.status}`);
      console.log('Data:', error.response?.data);
    }
  }
}

test();
