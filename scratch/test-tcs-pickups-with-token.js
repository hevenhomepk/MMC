const axios = require('axios');

async function test() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjpbIlRyYWNrIiwiRWNvbSIsIk5vdGlmaWNhdGlvbiJdLCJjbGllbnRpZCI6IjIxNTYxMDU1MiIsInNlcnZpY2VzIjoiMTAzLDE1NSwxNjEsMTY0LDIyNSwyNDcsMjQ4LDI0OSwyNTAsMjUxLDI3NywyOTMsNDQ4LDQ0OSw0NTAsNDUxLDQ1Miw0NTMsNDU0LDEwMTAiLCJleGNsdWRlZC1zZXJ2aWNlcyI6IiIsImlzcyI6InVhdC1taWRkbGV3YXJlLnRyYW56dW1way5jb20iLCJqdGkiOiI4MzMzNDRiNC0zNDQ0LTRhY2EtODhhNi1lN2VlNWQ3NGYzMzEiLCJuYmYiOjE3NTMwOTY3NTAsImV4cCI6MTgzOTQ5Njc1MCwiaWF0IjoxNzUzMDk2NzUwfQ.DIx4XCcda3QuVrp0HVaE7DB9Gz6eMn4d_jPUsFG16V0';
  const accountNumber = '04011K1';

  const urls = [
    'https://devconnect.tcscourier.com/ecom/api',
    'https://ociconnect.tcscourier.com/ecom/api'
  ];

  for (const baseUrl of urls) {
    console.log(`\n--- Testing pickups on ${baseUrl} ---`);
    try {
      const res = await axios.get(`${baseUrl}/inquiry/costcenterinquiry`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params: {
          accesstoken: token,
          customerno: accountNumber
        },
        timeout: 8000
      });
      console.log('Pickups success:', res.status, res.data);
    } catch (e) {
      console.log('Pickups failed:', e.response?.status, e.response?.data || e.message);
    }
  }
}

test();
