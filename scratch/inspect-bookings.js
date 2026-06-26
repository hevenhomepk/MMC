const db = require('../src/server/db');

async function run() {
  try {
    const res = await db.query('SELECT * FROM bookings');
    console.log('All bookings:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
