const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
console.log('Env path:', envPath);
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line, index) => {
    console.log(`${index + 1}: ${line}`);
  });
} else {
  console.log('Env file does not exist');
}
