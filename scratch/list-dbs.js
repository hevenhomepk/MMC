const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
  try {
    await client.connect();
    const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Databases:', res.rows.map(r => r.datname));
  } catch (err) {
    console.error('Error listing DBs:', err.message);
  } finally {
    await client.end();
  }
}

run();
