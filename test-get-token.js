const axios = require('axios');

const TCS_BASE_URL = 'https://ociconnect.tcscourier.com/ecom/api';
const username = 'testenvio';
const password = 'abc123+';

async function testQuery() {
  try {
    console.log('--- Strategy A: GET with query params ---');
    const url = `${TCS_BASE_URL}/authentication/token?username=${username}&password=${password}`;
    console.log('Requesting:', url);
    const response = await axios.get(url);
    console.log('Response:', response.status, response.data);
  } catch (err) {
    console.log('Strategy A Failed. Status:', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }
}

async function testHeaders() {
  try {
    console.log('\n--- Strategy B: GET with headers ---');
    const url = `${TCS_BASE_URL}/authentication/token`;
    console.log('Requesting:', url);
    const response = await axios.get(url, {
      headers: {
        'username': username,
        'password': password
      }
    });
    console.log('Response:', response.status, response.data);
  } catch (err) {
    console.log('Strategy B Failed. Status:', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }
}

async function run() {
  await testQuery();
  await testHeaders();
}

run();
