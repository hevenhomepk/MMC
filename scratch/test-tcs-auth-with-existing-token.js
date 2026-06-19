const axios = require('axios');

async function test() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjpbIlRyYWNrIiwiRWNvbSIsIk5vdGlmaWNhdGlvbiJdLCJjbGllbnRpZCI6IjIxNTYxMDU1MiIsInNlcnZpY2VzIjoiMTAzLDE1NSwxNjEsMTY0LDIyNSwyNDcsMjQ4LDI0OSwyNTAsMjUxLDI3NywyOTMsNDQ4LDQ0OSw0NTAsNDUxLDQ1Miw0NTMsNDU0LDEwMTAiLCJleGNsdWRlZC1zZXJ2aWNlcyI6IiIsImlzcyI6InVhdC1taWRkbGV3YXJlLnRyYW56dW1way5jb20iLCJqdGkiOiI4MzMzNDRiNC0zNDQ0LTRhY2EtODhhNi1lN2VlNWQ3NGYzMzEiLCJuYmYiOjE3NTMwOTY3NTAsImV4cCI6MTgzOTQ5Njc1MCwiaWF0IjoxNzUzMDk2NzUwfQ.DIx4XCcda3QuVrp0HVaE7DB9Gz6eMn4d_jPUsFG16V0';

  try {
    console.log('Testing GET token with Authorization header...');
    const res = await axios.get('https://devconnect.tcscourier.com/ecom/api/authentication/token', {
      params: { username: 'testenvio', password: 'abc123+' },
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      timeout: 8000
    });
    console.log('GET token Success:', res.status, res.data);
  } catch (error) {
    console.log('GET token Failed:', error.response?.status, error.response?.data || error.message);
  }
}

test();
