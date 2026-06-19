const axios = require('axios');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');

  const configs = [
    {
      name: 'GET with Basic Auth',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`
      }
    },
    {
      name: 'POST with Basic Auth',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`
      }
    },
    {
      name: 'GET with client_id and client_secret query params',
      method: 'GET',
      params: {
        client_id: credentials.username,
        client_secret: credentials.password
      }
    },
    {
      name: 'GET with apiKey query param',
      method: 'GET',
      params: {
        apiKey: credentials.password,
        username: credentials.username
      }
    },
    {
      name: 'GET with custom headers (x-client-id, x-client-secret)',
      method: 'GET',
      headers: {
        'x-client-id': credentials.username,
        'x-client-secret': credentials.password
      }
    },
    {
      name: 'GET with custom headers (client-id, client-secret)',
      method: 'GET',
      headers: {
        'client-id': credentials.username,
        'client-secret': credentials.password
      }
    }
  ];

  for (const c of configs) {
    console.log(`\n--- Testing: ${c.name} ---`);
    try {
      const response = await axios({
        method: c.method,
        url: 'https://devconnect.tcscourier.com/ecom/api/authentication/token',
        params: c.params,
        headers: {
          'Accept': 'application/json',
          ...c.headers
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
