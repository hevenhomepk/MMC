const axios = require('axios');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const urls = [
    'https://devconnect.tcscourier.com/auth/api/auth',
    'https://ociconnect.tcscourier.com/auth/api/auth'
  ];

  const variants = [
    {
      name: 'GET with username/password params',
      fn: (url) => axios.get(url, {
        params: credentials,
        timeout: 5000
      })
    },
    {
      name: 'GET with clientid/clientsecret params',
      fn: (url) => axios.get(url, {
        params: {
          clientid: credentials.username,
          clientsecret: credentials.password
        },
        timeout: 5000
      })
    },
    {
      name: 'GET with JSON body clientid/clientsecret',
      fn: (url) => axios({
        method: 'GET',
        url: url,
        data: {
          clientid: credentials.username,
          clientsecret: credentials.password
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      })
    },
    {
      name: 'POST with JSON body clientid/clientsecret',
      fn: (url) => axios.post(url, {
        clientid: credentials.username,
        clientsecret: credentials.password
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      })
    }
  ];

  for (const url of urls) {
    for (const v of variants) {
      console.log(`\n--- Testing ${v.name} on ${url} ---`);
      try {
        const response = await v.fn(url);
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
