const axios = require('axios');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const urls = [
    'https://devconnect.tcscourier.com/ecom/api/authentication/token',
    'https://devconnect.tcscourier.com/ecom/api/authentication/token/',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token/'
  ];

  const variants = [
    {
      name: 'POST with JSON body, user-agent, accept',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'PostmanRuntime/7.29.2'
      },
      data: credentials
    },
    {
      name: 'POST JSON with clientid/clientsecret',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        clientid: credentials.username,
        clientsecret: credentials.password
      }
    },
    {
      name: 'POST JSON with ClientID/ClientSecret',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        ClientID: credentials.username,
        ClientSecret: credentials.password
      }
    }
  ];

  for (const url of urls) {
    for (const v of variants) {
      console.log(`\n--- Testing ${v.name} on ${url} ---`);
      try {
        const response = await axios({
          method: 'POST',
          url: url,
          headers: v.headers,
          data: v.data,
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
}

test();
