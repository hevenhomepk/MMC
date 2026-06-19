const axios = require('axios');

const GATEWAY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjpbIlRyYWNrIiwiRWNvbSIsIk5vdGlmaWNhdGlvbiJdLCJjbGllbnRpZCI6IjIxNTYxMDU1MiIsInNlcnZpY2VzIjoiMTAzLDE1NSwxNjEsMTY0LDIyNSwyNDcsMjQ4LDI0OSwyNTAsMjUxLDI3NywyOTMsNDQ4LDQ0OSw0NTAsNDUxLDQ1Miw0NTMsNDU0LDEwMTAiLCJleGNsdWRlZC1zZXJ2aWNlcyI6IiIsImlzcyI6InVhdC1taWRkbGV3YXJlLnRyYW56dW1way5jb20iLCJqdGkiOiI4MzMzNDRiNC0zNDQ0LTRhY2EtODhhNi1lN2VlNWQ3NGYzMzEiLCJuYmYiOjE3NTMwOTY3NTAsImV4cCI6MTgzOTQ5Njc1MCwiaWF0IjoxNzUzMDk2NzUwfQ.DIx4XCcda3QuVrp0HVaE7DB9Gz6eMn4d_jPUsFG16V0';

async function run() {
  // Step 1: Get E-COM access token
  const authRes = await axios.get('https://devconnect.tcscourier.com/ecom/api/authentication/token', {
    params: { username: 'testenvio', password: 'abc123+' },
    headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}`, 'Accept': 'application/json' },
    timeout: 8000
  });
  const accessToken = authRes.data.accesstoken;
  console.log('Access token obtained.');

  // Step 2: Fetch cost centers
  const res = await axios.get('https://devconnect.tcscourier.com/ecom/api/inquiry/costcenterinquiry', {
    headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
    params: { accesstoken: accessToken, customerno: '04011K1' },
    timeout: 8000
  });

  // Inspect raw response structure
  console.log('\n--- Top-level keys:', Object.keys(res.data));
  
  if (Array.isArray(res.data)) {
    console.log('Response is an array of length:', res.data.length);
    console.log('First item keys:', Object.keys(res.data[0] || {}));
    console.log('First 3 items:', JSON.stringify(res.data.slice(0, 3), null, 2));
  } else if (typeof res.data === 'object') {
    for (const key of Object.keys(res.data)) {
      const val = res.data[key];
      if (Array.isArray(val)) {
        console.log(`\nKey "${key}" is an array of length:`, val.length);
        console.log(`First item keys:`, Object.keys(val[0] || {}));
        console.log(`First 3 items:`, JSON.stringify(val.slice(0, 3), null, 2));
      } else {
        console.log(`Key "${key}":`, typeof val, val);
      }
    }
  }
}

run().catch(e => console.error('Error:', e.response?.data || e.message));
