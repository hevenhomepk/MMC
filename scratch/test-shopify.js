const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the parent directory's .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const shop = 'luxessentials-qwfswl1g.myshopify.com';
const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

async function run() {
  console.log('Access token:', accessToken ? 'Exists (starts with ' + accessToken.slice(0, 10) + ')' : 'Missing');
  try {
    const url = `https://${shop}/admin/api/2025-01/orders.json`;
    console.log(`Fetching orders from ${url}...`);
    const res = await axios.get(url, {
      params: { limit: 5, status: 'any' },
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      }
    });
    console.log('Orders found:', res.data.orders.map(o => ({ id: o.id, name: o.name, fulfillment_status: o.fulfillment_status })));
  } catch (err) {
    console.error('Error fetching from Shopify:', err.response?.data || err.message);
  }
}

run();
