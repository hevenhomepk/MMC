const db = require('../src/server/db');

async function run() {
  try {
    const res = await db.query('SELECT id, shop_domain, username FROM tcs_accounts');
    console.log('TCS Accounts in DB:', JSON.stringify(res.rows, null, 2));

    const bookingsRes = await db.query('SELECT id, shop_domain, order_id, courier, tracking_number FROM bookings');
    console.log('Bookings in DB:', JSON.stringify(bookingsRes.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
