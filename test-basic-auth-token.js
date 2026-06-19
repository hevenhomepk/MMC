const axios = require('axios');
const TCS_BASE_URL = 'https://ociconnect.tcscourier.com/ecom/api';
const username = 'testenvio';
const password = 'abc123+';

async function testToken() {
  try {
    // POST with Basic Auth, no body
    const res = await axios.post(`${TCS_BASE_URL}/authentication/token`, {}, {
      auth: { username, password },
      timeout: 8000
    });
    console.log('POST token success', res.status, res.data);
  } catch (err) {
    console.error('POST token error', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }
  try {
    // GET with Basic Auth
    const res2 = await axios.get(`${TCS_BASE_URL}/authentication/token`, {
      auth: { username, password },
      timeout: 8000
    });
    console.log('GET token success', res2.status, res2.data);
  } catch (err) {
    console.error('GET token error', err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }
}

testToken();
