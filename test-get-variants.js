const axios = require('axios');

const DEV_BASE_URL = 'https://devconnect.tcscourier.com/ecom/api';
const username = 'testenvio';
const password = 'abc123+';

async function test(name, config) {
  try {
    console.log(`\n--- Test: ${name} ---`);
    const response = await axios.get(`${DEV_BASE_URL}/authentication/token`, config);
    console.log('Success:', response.status, response.data);
    return true;
  } catch (err) {
    console.log('Failed:', err.response ? err.response.status : err.message);
    if (err.response) {
      console.log('Headers:', err.response.headers);
      console.log('Data:', err.response.data);
    }
    return false;
  }
}

async function run() {
  // 1. Try standard query params (already failed on production, let's test sandbox)
  await test('Query Params (username/password)', {
    params: { username, password }
  });

  // 2. Try query params with clientid/clientsecret
  await test('Query Params (clientid/clientsecret)', {
    params: { clientid: username, clientsecret: password }
  });

  // 3. Try headers X-Username / X-Password
  await test('Headers (X-Username/X-Password)', {
    headers: {
      'X-Username': username,
      'X-Password': password
    }
  });

  // 4. Try headers X-ClientId / X-ClientSecret
  await test('Headers (X-ClientId/X-ClientSecret)', {
    headers: {
      'X-ClientId': username,
      'X-ClientSecret': password
    }
  });

  // 5. Try headers clientid / clientsecret
  await test('Headers (clientid/clientsecret)', {
    headers: {
      'clientid': username,
      'clientsecret': password
    }
  });

  // 6. Try Axios GET with body (data)
  await test('GET Body (username/password)', {
    data: { username, password }
  });

  // 7. Try Axios GET with body (clientid/clientsecret)
  await test('GET Body (clientid/clientsecret)', {
    data: { clientid: username, clientsecret: password }
  });
}

run();
