const axios = require('axios');

async function test() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjpbIlRyYWNrIiwiRWNvbSIsIk5vdGlmaWNhdGlvbiJdLCJjbGllbnRpZCI6IjIxNTYxMDU1MiIsInNlcnZpY2VzIjoiMTAzLDE1NSwxNjEsMTY0LDIyNSwyNDcsMjQ4LDI0OSwyNTAsMjUxLDI3NywyOTMsNDQ4LDQ0OSw0NTAsNDUxLDQ1Miw0NTMsNDU0LDEwMTAiLCJleGNsdWRlZC1zZXJ2aWNlcyI6IiIsImlzcyI6InVhdC1taWRkbGV3YXJlLnRyYW56dW1way5jb20iLCJqdGkiOiI4MzMzNDRiNC0zNDQ0LTRhY2EtODhhNi1lN2VlNWQ3NGYzMzEiLCJuYmYiOjE3NTMwOTY3NTAsImV4cCI6MTgzOTQ5Njc1MCwiaWF0IjoxNzUzMDk2NzUwfQ.DIx4XCcda3QuVrp0HVaE7DB9Gz6eMn4d_jPUsFG16V0';

  const variations = [
    { name: 'customerno: 04011K1, Auth header + query param', customerno: '04011K1', useAuthHeader: true },
    { name: 'customerno: 215610552, Auth header + query param', customerno: '215610552', useAuthHeader: true },
    { name: 'customerno: 04011K1, query param only', customerno: '04011K1', useAuthHeader: false },
    { name: 'customerno: 215610552, query param only', customerno: '215610552', useAuthHeader: false },
    { name: 'customerno: 04011K1, Auth header only', customerno: '04011K1', useAuthHeader: true, omitQueryParam: true }
  ];

  for (const v of variations) {
    console.log(`\n--- Testing: ${v.name} ---`);
    const headers = { 'Content-Type': 'application/json' };
    if (v.useAuthHeader) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = { customerno: v.customerno };
    if (!v.omitQueryParam) {
      params['accesstoken'] = token;
    }

    try {
      const res = await axios.get('https://devconnect.tcscourier.com/ecom/api/inquiry/costcenterinquiry', {
        headers,
        params,
        timeout: 8000
      });
      console.log('Success:', res.status, res.data);
    } catch (e) {
      console.log('Failed:', e.response?.status, e.response?.data || e.message);
    }
  }
}

test();
