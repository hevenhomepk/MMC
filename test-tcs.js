// test-tcs.js
// Updated script to validate TCS credentials online and fetch pickup addresses via the tcsService.

const tcsService = require('./src/server/services/tcsService');

const credentials = {
  username: 'testenvio',
  password: 'abc123+',
  accountNumber: '04011K1'
};

async function run() {
  try {
    const result = await tcsService.validateAndFetchPickups(credentials);
    console.log('Validation successful. Received data:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Validation failed:', err.message);
  }
}

run();
