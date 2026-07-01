// src/server/services/settingsService.js
const db = require('../db');

const DEFAULTS = {
  logo_data: null,
  label_size: 'A4-3',
  website: '',
  shipper_name: '',
  shipper_phone: '',
  shipper_city: '',
  shipper_address: '',
};

async function getSettings(shop) {
  if (!shop) throw new Error('Shop identifier is required.');
  const res = await db.query('SELECT * FROM shop_settings WHERE shop_domain = $1', [shop]);
  if (res.rows.length === 0) return { shop_domain: shop, ...DEFAULTS };
  return res.rows[0];
}

async function saveSettings(shop, data = {}) {
  if (!shop) throw new Error('Shop identifier is required.');
  const merged = { ...DEFAULTS, ...data };
  const res = await db.query(
    `INSERT INTO shop_settings
       (shop_domain, logo_data, label_size, website, shipper_name, shipper_phone, shipper_city, shipper_address, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (shop_domain) DO UPDATE SET
       logo_data       = EXCLUDED.logo_data,
       label_size      = EXCLUDED.label_size,
       website         = EXCLUDED.website,
       shipper_name    = EXCLUDED.shipper_name,
       shipper_phone   = EXCLUDED.shipper_phone,
       shipper_city    = EXCLUDED.shipper_city,
       shipper_address = EXCLUDED.shipper_address,
       updated_at      = NOW()
     RETURNING *`,
    [
      shop, merged.logo_data, merged.label_size, merged.website,
      merged.shipper_name, merged.shipper_phone, merged.shipper_city, merged.shipper_address,
    ]
  );
  return res.rows[0];
}

module.exports = { getSettings, saveSettings };
