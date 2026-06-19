const axios = require('axios');
const TCS_BASE_URL = 'https://ociconnect.tcscourier.com/ecom/api';
const username = 'testenvio';
const password = 'abc123+';

async function testPost() {
  try {
    const res = await axios.post(`${TCS_BASE_URL}/authentication/token`, { username, password }, { headers: { 'Content-Type': 'application/json' } });
    console.log('POST success:', res.status, res.data);
  } catch (e) {
    if (e.response) {
      console.log('POST error status:', e.response.status);
      console.log('Response data:', e.response.data);
    } else {
      console.log('Error:', e.message);
    }
  }
}

testPost();
