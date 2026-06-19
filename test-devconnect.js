const axios = require('axios');

const DEV_BASE_URL = 'https://devconnect.tcscourier.com/ecom/api';
const username = 'testenvio';
const password = 'abc123+';

async function testPost() {
  try {
    console.log('--- Sandbox: POST ---');
    const response = await axios.post(`${DEV_BASE_URL}/authentication/token`, {
      username: username,
      password: password
    });
    console.log('Sandbox POST Response:', response.status, response.data);
  } catch (err) {
    console.log('Sandbox POST Failed. Status:', err.response ? err.response.status : err.message);
    if (err.response) {
      console.log('Headers:', err.response.headers);
      console.log('Data:', err.response.data);
    }
  }
}

async function testGet() {
  try {
    console.log('\n--- Sandbox: GET ---');
    const response = await axios.get(`${DEV_BASE_URL}/authentication/token`, {
      headers: {
        'username': username,
        'password': password
      }
    });
    console.log('Sandbox GET Response:', response.status, response.data);
  } catch (err) {
    console.log('Sandbox GET Failed. Status:', err.response ? err.response.status : err.message);
    if (err.response) {
      console.log('Headers:', err.response.headers);
      console.log('Data:', err.response.data);
    }
  }
}

async function run() {
  await testPost();
  await testGet();
}

run();
