const db = require('../src/server/db');

async function run() {
  try {
    const res = await db.query(
      "SELECT * FROM bookings WHERE order_id IN ('#1001', '#1002', '1001', '1002') OR shop_domain = 'luxessentials-qwfswl1g.myshopify.com'"
    );
    console.log('Bookings matching criteria:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
