const db = require('../src/server/db');

async function run() {
  try {
    const tablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log('Tables:', tablesRes.rows.map(r => r.table_name));

    for (const row of tablesRes.rows) {
      const countRes = await db.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
      console.log(`Table ${row.table_name} count:`, countRes.rows[0].count);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
