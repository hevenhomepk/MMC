const axios = require('axios');

const TCS_BASE_URL = 'https://ociconnect.tcscourier.com/ecom/api';
const username = 'testenvio';
const password = 'abc123+';
const accountNumber = '04011K1';

async function run() {
  try {
    console.log('--- Step 1: Getting token ---');
    console.log('Posting to:', `${TCS_BASE_URL}/authentication/token`);
    const authResponse = await axios.post(`${TCS_BASE_URL}/authentication/token`, {
      username: username,
      password: password
    });
    const token = authResponse.data?.accesstoken || authResponse.data?.token;
    console.log('Token response:', authResponse.data);
    console.log('Retrieved Token:', token);

    if (!token) {
      console.log('No token retrieved');
      return;
    }

    console.log('\n--- Step 2: Fetching costCenters ---');
    const urlObj = new URL(TCS_BASE_URL);
    // Try https://ociconnect.tcscourier.com/api/costCenters
    const costCentersUrl = `${urlObj.protocol}//${urlObj.host}/api/costCenters`;
    console.log('Getting from:', costCentersUrl);
    
    const response = await axios.get(costCentersUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Username': username,
        'X-Password': password,
        'X-AccountNumber': accountNumber
      }
    });
    console.log('CostCenters success response:', response.data);
  } catch (err) {
    console.error('Error occurred:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
      console.error('Headers:', err.response.headers);
    } else {
      console.error('Message:', err.message);
    }
  }
}

run();
