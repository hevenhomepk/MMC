const axios = require('axios');

async function test() {
  const credentials = {
    username: 'testenvio',
    password: '@abc123+-'
  };

  const permutations = [
    // clientid / clientsecret as query params
    {
      name: 'GET query params (clientid/clientsecret)',
      config: {
        method: 'GET',
        url: 'https://devconnect.tcscourier.com/ecom/api/authentication/token',
        params: {
          clientid: credentials.username,
          clientsecret: credentials.password
        }
      }
    },
    // clientid / clientsecret as JSON body
    {
      name: 'GET JSON body (clientid/clientsecret)',
      config: {
        method: 'GET',
        url: 'https://devconnect.tcscourier.com/ecom/api/authentication/token',
        data: {
          clientid: credentials.username,
          clientsecret: credentials.password
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    },
    // clientid / clientsecret as headers
    {
      name: 'GET headers (clientid/clientsecret)',
      config: {
        method: 'GET',
        url: 'https://devconnect.tcscourier.com/ecom/api/authentication/token',
        headers: {
          clientid: credentials.username,
          clientsecret: credentials.password
        }
      }
    },
    // clientid / clientsecret in headers with different capitalization
    {
      name: 'GET headers (ClientID/ClientSecret)',
      config: {
        method: 'GET',
        url: 'https://devconnect.tcscourier.com/ecom/api/authentication/token',
        headers: {
          ClientID: credentials.username,
          ClientSecret: credentials.password
        }
      }
    },
    // GET with API Key header name: 'x-api-key' or similar?
    {
      name: 'GET header (X-API-Key)',
      config: {
        method: 'GET',
        url: 'https://devconnect.tcscourier.com/ecom/api/authentication/token',
        headers: {
          'x-api-key': credentials.password,
          'username': credentials.username
        }
      }
    }
  ];

  for (const p of permutations) {
    console.log(`\n--- Testing: ${p.name} ---`);
    try {
      const response = await axios({
        ...p.config,
        headers: {
          'Accept': 'application/json',
          ...p.config.headers
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
