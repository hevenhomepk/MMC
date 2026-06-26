const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const shop = 'luxessentials-qwfswl1g.myshopify.com';
const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

async function run() {
  try {
    const url = `https://${shop}/admin/api/2025-01/shop.json`;
    console.log(`Fetching shop info from ${url}...`);
    const res = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      }
    });
    console.log('Shop Info:', res.data.shop);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
