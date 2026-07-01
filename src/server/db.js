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
    ALTER TABLE tcs_accounts ADD COLUMN IF NOT EXISTS pickup_addresses_data TEXT;
    ALTER TABLE tcs_accounts ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
    ALTER TABLE tcs_accounts ADD COLUMN IF NOT EXISTS shipper_phone VARCHAR(20);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignee_phone VARCHAR(50);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS loadsheet_id INTEGER;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS traceid VARCHAR(255);
    ALTER TABLE loadsheets ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE loadsheets ADD COLUMN IF NOT EXISTS total_cod DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS order_amount DECIMAL(15,2) DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_sheet_id INTEGER;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_status VARCHAR(50);

    -- Account feature flags: only present in CREATE TABLE, so pre-existing tables miss them.
    -- A missing auto_fulfillment column reads as undefined → falsy → Shopify fulfillment is skipped.
    ALTER TABLE tcs_accounts    ADD COLUMN IF NOT EXISTS auto_fulfillment BOOLEAN DEFAULT true;
    ALTER TABLE tcs_accounts    ADD COLUMN IF NOT EXISTS auto_save_tracking BOOLEAN DEFAULT false;
    ALTER TABLE tcs_accounts    ADD COLUMN IF NOT EXISTS mark_paid_zero BOOLEAN DEFAULT true;
    ALTER TABLE tcs_accounts    ADD COLUMN IF NOT EXISTS auto_calc_weight BOOLEAN DEFAULT false;
    ALTER TABLE tcs_accounts    ADD COLUMN IF NOT EXISTS auto_calc_pieces BOOLEAN DEFAULT false;
    ALTER TABLE tcs_accounts    ADD COLUMN IF NOT EXISTS add_order_notes BOOLEAN DEFAULT false;
    ALTER TABLE postex_accounts ADD COLUMN IF NOT EXISTS auto_fulfillment BOOLEAN DEFAULT true;
    ALTER TABLE postex_accounts ADD COLUMN IF NOT EXISTS auto_save_tracking BOOLEAN DEFAULT false;
    ALTER TABLE postex_accounts ADD COLUMN IF NOT EXISTS mark_paid_zero BOOLEAN DEFAULT true;
    ALTER TABLE postex_accounts ADD COLUMN IF NOT EXISTS auto_calc_weight BOOLEAN DEFAULT false;
    ALTER TABLE postex_accounts ADD COLUMN IF NOT EXISTS auto_calc_pieces BOOLEAN DEFAULT false;
    ALTER TABLE postex_accounts ADD COLUMN IF NOT EXISTS add_order_notes BOOLEAN DEFAULT false;

    -- Extra booking fields needed to render custom labels (address/products/etc.).
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignee_address TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignee_email VARCHAR(255);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS product_details TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS weight VARCHAR(20);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pieces INTEGER DEFAULT 1;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type VARCHAR(50);
  `;

  // ── Per-shop settings: custom label logo + brand/shipper profile ────────────
  const createShopSettingsTableQuery = `
    CREATE TABLE IF NOT EXISTS shop_settings (
      shop_domain     VARCHAR(255) PRIMARY KEY,
      logo_data       TEXT,                       -- data URL or external image URL
      label_size      VARCHAR(50) DEFAULT 'A4-3', -- A4-3 | A4-1 | THERMAL | COPIES-3
      website         VARCHAR(255),
      shipper_name    VARCHAR(255),
      shipper_phone   VARCHAR(50),
      shipper_city    VARCHAR(100),
      shipper_address TEXT,
      updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // ── NEW: dedicated token store ───────────────────────────────────────────────
  const createTcsTokensTableQuery = `
    CREATE TABLE IF NOT EXISTS tcs_tokens (
      id           SERIAL PRIMARY KEY,
      username     VARCHAR(255) NOT NULL,
      shop_domain  VARCHAR(255) NOT NULL,
      access_token TEXT        NOT NULL,
      token_type   VARCHAR(50)  DEFAULT 'Bearer',
      issued_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
      expires_at   TIMESTAMPTZ,
      is_active    BOOLEAN      DEFAULT true,
      created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (username, shop_domain)
    );
    CREATE INDEX IF NOT EXISTS idx_tcs_tokens_username ON tcs_tokens (username, shop_domain);
    CREATE INDEX IF NOT EXISTS idx_tcs_tokens_expires  ON tcs_tokens (expires_at);
  `;

  // ── NEW: normalized pickup address rows ─────────────────────────────────────
  const createPickupAddressesTableQuery = `
    CREATE TABLE IF NOT EXISTS pickup_addresses (
      id             SERIAL PRIMARY KEY,
      account_id     INTEGER REFERENCES tcs_accounts(id) ON DELETE CASCADE,
      address_id     VARCHAR(100),
      address_line   TEXT,
      city           VARCHAR(100),
      state          VARCHAR(100),
      zip            VARCHAR(20),
      account_number VARCHAR(100) NOT NULL,
      shop_domain    VARCHAR(255) NOT NULL,
      loaded_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (account_number, shop_domain, address_id)
    );
    CREATE INDEX IF NOT EXISTS idx_pickup_acct ON pickup_addresses (account_number, shop_domain);
  `;

  // ── NEW: cost centers for UI dropdown ───────────────────────────────────────
  const createCostCentersTableQuery = `
    CREATE TABLE IF NOT EXISTS cost_centers (
      id               SERIAL PRIMARY KEY,
      costcentercode   VARCHAR(100) NOT NULL,
      costcentername   VARCHAR(255),
      costcentercity   VARCHAR(100),
      pickup_address   TEXT,
      return_address   TEXT,
      phone            VARCHAR(50),
      email            VARCHAR(255),
      print_on_label   BOOLEAN      DEFAULT false,
      account_number   VARCHAR(100) NOT NULL,
      shop_domain      VARCHAR(255) NOT NULL,
      loaded_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (costcentercode, account_number, shop_domain)
    );
    CREATE INDEX IF NOT EXISTS idx_cc_acct ON cost_centers (account_number, shop_domain);
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
    await pool.query(createTcsTokensTableQuery);
    await pool.query(createPickupAddressesTableQuery);
    await pool.query(createCostCentersTableQuery);
    await pool.query(createShopSettingsTableQuery);
    
    // One-time database cleanup for user request: change order #1001 and #1002 to unfulfilled (unbooked)
    await pool.query(`
      DELETE FROM bookings 
      WHERE order_id IN ('#1001', '#1002', '1001', '1002') 
        AND shop_domain = 'luxessentials-qwfswl1g.myshopify.com'
    `);
    console.log('One-time database cleanup: order 1001 and 1002 changed to unfulfilled.');

    console.log('Database initialized: all tables ready.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    // Don't exit — the server will still serve static files even if DB is unavailable
  }
};

initDB();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
