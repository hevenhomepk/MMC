const db = require('./src/server/db');
async function fix() {
  try {
    const res = await db.query('SELECT id FROM loadsheets');
    for (let ls of res.rows) {
      const sumRes = await db.query('SELECT SUM(cod_amount) as cod FROM bookings WHERE loadsheet_id = $1', [ls.id]);
      const cod = sumRes.rows[0].cod || 0;
      await db.query('UPDATE loadsheets SET total_cod = $1, total_amount = $2 WHERE id = $3', [cod, cod, ls.id]);
      console.log('Updated loadsheet', ls.id, 'with amount', cod);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
fix();
