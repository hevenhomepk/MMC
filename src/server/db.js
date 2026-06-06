const { Pool } = require('pg');

// Use DATABASE_URL (Render/Heroku standard) or fall back to individual env vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Render's managed PostgreSQL
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      port: parseInt(process.env.DB_PORT || '5432'),
    });

const initDB = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tcs_accounts (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      account_number VARCHAR(255) NOT NULL,
      is_enabled BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      pickup_address VARCHAR(255),
      default_weight DECIMAL(10,2) DEFAULT 0.5,
      has_insurance BOOLEAN DEFAULT false,
      default_insurance DECIMAL(10,2),
      shipper_remarks TEXT,
      service_type VARCHAR(50) DEFAULT 'Express',
      is_fragile BOOLEAN DEFAULT false,
      label_print_option VARCHAR(100) DEFAULT 'Print Product Name Only',
      auto_fulfillment BOOLEAN DEFAULT true,
      auto_save_tracking BOOLEAN DEFAULT false,
      mark_paid_zero BOOLEAN DEFAULT true,
      auto_calc_weight BOOLEAN DEFAULT false,
      auto_calc_pieces BOOLEAN DEFAULT false,
      add_order_notes BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterTableQuery = `
    ALTER TABLE tcs_accounts ADD COLUMN IF NOT EXISTS access_token TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignee_phone VARCHAR(50);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS loadsheet_id INTEGER;
    ALTER TABLE loadsheets ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE loadsheets ADD COLUMN IF NOT EXISTS total_cod DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS order_amount DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_sheet_id INTEGER;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_status VARCHAR(50);
  `;

  const createPostExTableQuery = `
    CREATE TABLE IF NOT EXISTS postex_accounts (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      api_token TEXT NOT NULL,
      is_enabled BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      pickup_address_code VARCHAR(255),
      return_address_code VARCHAR(255),
      default_weight DECIMAL(10,2) DEFAULT 0.5,
      shipper_remarks TEXT,
      order_type VARCHAR(50) DEFAULT 'Normal',
      shipper_handling VARCHAR(50) DEFAULT 'Normal',
      label_print_option VARCHAR(100) DEFAULT 'Print Product Name only',
      auto_fulfillment BOOLEAN DEFAULT true,
      auto_save_tracking BOOLEAN DEFAULT false,
      mark_paid_zero BOOLEAN DEFAULT true,
      auto_calc_weight BOOLEAN DEFAULT false,
      auto_calc_pieces BOOLEAN DEFAULT false,
      add_order_notes BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createBookingsTableQuery = `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      order_id VARCHAR(100) NOT NULL,
      courier VARCHAR(50) NOT NULL,
      tracking_number VARCHAR(255) NOT NULL,
      consignee_name VARCHAR(255) NOT NULL,
      consignee_phone VARCHAR(50),
      consignee_city VARCHAR(255) NOT NULL,
      cod_amount DECIMAL(15,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'Booked',
      account_id INTEGER,
      loadsheet_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createLoadsheetsTableQuery = `
    CREATE TABLE IF NOT EXISTS loadsheets (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      courier VARCHAR(50) NOT NULL,
      loadsheet_number VARCHAR(100),
      total_shipments INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createReturnSheetsTableQuery = `
    CREATE TABLE IF NOT EXISTS return_sheets (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      courier VARCHAR(50) NOT NULL,
      return_sheet_number VARCHAR(100),
      total_shipments INTEGER DEFAULT 0,
      total_amount DECIMAL(15,2) DEFAULT 0,
      total_cod DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Created',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTableQuery);
    await pool.query(createPostExTableQuery);
    await pool.query(createBookingsTableQuery);
    await pool.query(createLoadsheetsTableQuery);
    await pool.query(createReturnSheetsTableQuery);
    await pool.query(alterTableQuery);
    console.log('Database initialized: all tables ready.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    // Don't exit — the server will still serve static files even if DB is unavailable
  }
};

initDB();

module.exports = {
  query: (text, params) => pool.query(text, params),
};
