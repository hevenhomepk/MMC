// test_tcs_auth.js
const axios = require('axios');
const TCS_BASE_URL = 'https://devconnect.tcscourier.com/ecom/api';
(async () => {
  try {
    const res = await axios.post(`${TCS_BASE_URL}/authentication/token`, {
      username: 'testenvio',
      password: '@abc123+-'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Error response status:', err.response.status);
      console.error('Error response data:', err.response.data);
    } else {
      console.error('Request error:', err.message);
    }
  }
})();
