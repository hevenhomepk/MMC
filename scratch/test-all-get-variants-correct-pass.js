const axios = require('axios');

async function test(name, url, config) {
  try {
    console.log(`\n--- Test: ${name} on ${url} ---`);
    const response = await axios.get(url, {
      ...config,
      timeout: 5000
    });
    console.log('Success:', response.status, response.data);
    return true;
  } catch (err) {
    console.log('Failed:', err.response ? err.response.status : err.message);
    if (err.response) {
      console.log('Data:', err.response.data);
    }
    return false;
  }
}

async function run() {
  const password = '@abc123+-';
  const username = 'testenvio';
  
  const urls = [
    'https://devconnect.tcscourier.com/ecom/api/authentication/token',
    'https://ociconnect.tcscourier.com/ecom/api/authentication/token'
  ];

  for (const url of urls) {
    // 1. Try standard query params
    await test('Query Params (username/password)', url, {
      params: { username, password }
    });

    // 2. Try query params with clientid/clientsecret
    await test('Query Params (clientid/clientsecret)', url, {
      params: { clientid: username, clientsecret: password }
    });

    // 3. Try headers X-Username / X-Password
    await test('Headers (X-Username/X-Password)', url, {
      headers: {
        'X-Username': username,
        'X-Password': password
      }
    });

    // 4. Try headers X-ClientId / X-ClientSecret
    await test('Headers (X-ClientId/X-ClientSecret)', url, {
      headers: {
        'X-ClientId': username,
        'X-ClientSecret': password
      }
    });

    // 5. Try headers clientid / clientsecret
    await test('Headers (clientid/clientsecret)', url, {
      headers: {
        'clientid': username,
        'clientsecret': password
      }
    });

    // 6. Try GET with body (username/password)
    await test('GET Body (username/password)', url, {
      data: { username, password }
    });

    // 7. Try GET with body (clientid/clientsecret)
    await test('GET Body (clientid/clientsecret)', url, {
      data: { clientid: username, clientsecret: password }
    });
  }
}

run();
