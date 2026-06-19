const axios = require('axios');
const qs = require('qs');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const methods = [
    {
      name: 'GET with params',
      fn: (url) => axios.get(url, {
        params: credentials,
        headers: { 'Accept': 'application/json' },
        timeout: 5000
      })
    },
    {
      name: 'POST JSON',
      fn: (url) => axios.post(url, credentials, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 5000
      })
    },
    {
      name: 'POST form-urlencoded',
      fn: (url) => axios.post(url, qs.stringify(credentials), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 5000
      })
    },
    {
      name: 'GET with headers',
      fn: (url) => axios.get(url, {
        headers: {
          'username': credentials.username,
          'password': credentials.password,
          'Accept': 'application/json'
        },
        timeout: 5000
      })
    }
  ];

  const urls = [
    'https://devconnect.tcscourier.com/ecom/api/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token'
  ];

  for (const url of urls) {
    for (const method of methods) {
      console.log(`\n--- Testing ${method.name} on ${url} ---`);
      try {
        const response = await method.fn(url);
        console.log(`Status: ${response.status}`);
        console.log('Data:', response.data);
      } catch (error) {
        console.log(`Status: ${error.response?.status}`);
        console.log('Error Data:', error.response?.data);
        console.log('Error Message:', error.message);
      }
    }
  }
}

test();
