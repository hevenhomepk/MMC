// src/server/services/tcsService.js
const axios = require('axios');
const crypto = require('crypto');
const db = require('../db');
const bookingService = require('./bookingService');
const shopifyService = require('./shopifyService');

// ─────────────────────────────────────────────────────────────────────────────
// Encryption helpers (AES-256-CBC, key from env)
// ─────────────────────────────────────────────────────────────────────────────
function encrypt(text) {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default_key_32bytes_long!', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  if (!encryptedText.includes(':')) return encryptedText;
  try {
    const textParts = encryptedText.split(':');
    const ivHex = textParts.shift();
    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== 16) {
      return encryptedText;
    }
    const encrypted = textParts.join(':');
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default_key_32bytes_long!', 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('[Decryption] Failed to decrypt text (returning as-is):', err.message);
    return encryptedText;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TCS API base URLs and gateway tokens
// ─────────────────────────────────────────────────────────────────────────────
const SANDBOX_GATEWAY_TOKEN = process.env.TCS_SANDBOX_GATEWAY_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjpbIlRyYWNrIiwiRWNvbSIsIk5vdGlmaWNhdGlvbiJdLCJjbGllbnRpZCI6IjIxNTYxMDU1MiIsInNlcnZpY2VzIjoiMTAzLDE1NSwxNjEsMTY0LDIyNSwyNDcsMjQ4LDI0OSwyNTAsMjUxLDI3NywyOTMsNDQ4LDQ0OSw0NTAsNDUxLDQ1Miw0NTMsNDU0LDEwMTAiLCJleGNsdWRlZC1zZXJ2aWNlcyI6IiIsImlzcyI6InVhdC1taWRkbGV3YXJlLnRyYW56dW1way5jb20iLCJqdGkiOiI4MzMzNDRiNC0zNDQ0LTRhY2EtODhhNi1lN2VlNWQ3NGYzMzEiLCJuYmYiOjE3NTMwOTY3NTAsImV4cCI6MTgzOTQ5Njc1MCwiaWF0IjoxNzUzMDk2NzUwfQ.DIx4XCcda3QuVrp0HVaE7DB9Gz6eMn4d_jPUsFG16V0';
const PROD_GATEWAY_TOKEN = process.env.TCS_PROD_GATEWAY_TOKEN || '';

// devconnect = sandbox/UAT, ociconnect = production.
// Sandbox is tried first because TCS_PROD_GATEWAY_TOKEN may not yet be set.
// To enable production, add TCS_PROD_GATEWAY_TOKEN to your Render env vars.
const TCS_ENVIRONMENTS = [
  { baseUrl: 'https://devconnect.tcscourier.com/ecom/api' },
  { baseUrl: 'https://ociconnect.tcscourier.com/ecom/api' },
];

// Sandbox gateway token authenticates devconnect calls; prod token for ociconnect.
// The accesstoken from /authentication/token goes in the JSON *body* — not the header.
function getGatewayToken(baseUrl) {
  const isProd = baseUrl && baseUrl.includes('ociconnect.tcscourier.com');
  if (isProd) {
    return process.env.TCS_PROD_GATEWAY_TOKEN || PROD_GATEWAY_TOKEN;
  }
  return process.env.TCS_SANDBOX_GATEWAY_TOKEN || SANDBOX_GATEWAY_TOKEN;
}

// Keep a no-arg version for backwards-compat (defaults to sandbox)
function getDefaultGatewayToken() {
  return process.env.TCS_GATEWAY_TOKEN || SANDBOX_GATEWAY_TOKEN;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured error factory
// Codes: TOKEN_EXPIRED | ACCOUNT_NOT_FOUND | EMPTY_RESPONSE | INVALID_CREDENTIALS | NETWORK_ERROR
// ─────────────────────────────────────────────────────────────────────────────
function tcsError(message, code = 'UNKNOWN', retryable = false) {
  const err = new Error(message);
  err.tcsCode = code;
  err.retryable = retryable;
  return err;
}

function classifyApiError(axiosError, context = '') {
  const status = axiosError.response?.status;
  const msg = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.message || '';

  if (!axiosError.response) {
    return tcsError(
      `Could not reach TCS server${context ? ' (' + context + ')' : ''}. Please check your connection and try again.`,
      'NETWORK_ERROR',
      true
    );
  }
  if (status === 401 || /token.*expired|expired.*token|unauthorized/i.test(msg)) {
    return tcsError(
      'Access token expired. Please re-validate your credentials.',
      'TOKEN_EXPIRED',
      true
    );
  }
  if (status === 401 || /invalid.*username|invalid.*password|incorrect.*credentials/i.test(msg)) {
    return tcsError(
      'Invalid credentials. Please check your TCS username and password.',
      'INVALID_CREDENTIALS',
      false
    );
  }
  if (/customer.*not found|account.*not found/i.test(msg)) {
    return tcsError(
      'Account number not found. Verify your TCS account number.',
      'ACCOUNT_NOT_FOUND',
      false
    );
  }
  return tcsError(msg || 'Unexpected TCS API error.', 'API_ERROR', false);
}

// ─────────────────────────────────────────────────────────────────────────────
// Token cache helpers (tcs_tokens table)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns cached valid token for (username, shop) or null if missing/expired.
 */
async function getCachedToken(username, shop) {
  try {
    const res = await db.query(
      `SELECT access_token, expires_at FROM tcs_tokens
       WHERE username = $1 AND shop_domain = $2 AND is_active = true`,
      [username, shop]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    // Add a 60-second buffer so we never use a token that's about to expire
    if (row.expires_at && new Date(row.expires_at) <= new Date(Date.now() + 60_000)) {
      console.log(`[TCS Token Cache] Cached token for ${username}@${shop} is expired or expiring soon.`);
      return null;
    }
    // Decrypt before returning
    return decrypt(row.access_token);
  } catch (err) {
    // Cache miss is non-fatal — fall through to fresh fetch
    console.warn('[TCS Token Cache] Cache read failed (non-fatal):', err.message);
    return null;
  }
}

/**
 * Parse TCS expiry string ("2025-07-22T10:30:00" or similar) into a Date.
 * Returns null if unparseable.
 */
function parseExpiry(expiry) {
  if (!expiry) return null;
  try {
    const d = new Date(expiry);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Saves (or updates) a token in tcs_tokens, encrypted at rest.
 * @param {string} username
 * @param {string} shop      - shop domain (may be null for verify-only flows)
 * @param {string} plainToken
 * @param {Date|null} expiresAt
 */
async function saveTokenToDb(username, shop, plainToken, expiresAt) {
  const shopDomain = shop || '_global_';
  try {
    const encryptedToken = encrypt(plainToken);
    await db.query(
      `INSERT INTO tcs_tokens (username, shop_domain, access_token, token_type, issued_at, expires_at, is_active, updated_at)
       VALUES ($1, $2, $3, 'Bearer', NOW(), $4, true, NOW())
       ON CONFLICT (username, shop_domain) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         issued_at    = EXCLUDED.issued_at,
         expires_at   = EXCLUDED.expires_at,
         is_active    = true,
         updated_at   = NOW()`,
      [username, shopDomain, encryptedToken, expiresAt || null]
    );
    console.log(`[TCS Token] Saved token for ${username}@${shopDomain}, expires: ${expiresAt || 'unknown'}`);
  } catch (err) {
    // Non-fatal — token will be re-fetched next time
    console.error('[TCS Token] Failed to save token to DB (non-fatal):', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Authenticate and get access token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches (or returns cached) TCS access token.
 * Tries production URL first, then sandbox.
 * Saves token to tcs_tokens table encrypted.
 *
 * @param {string} username
 * @param {string} password  - plain text (not encrypted)
 * @param {string} [shop]    - shop domain for token caching
 * @returns {{ token, expiry, expiresAt, baseUrl, gatewayToken }}
 */
async function getTcsToken(username, password, shop = null) {
  const gatewayToken = getGatewayToken();

  // Check DB cache first (only when shop is provided)
  if (shop) {
    const cached = await getCachedToken(username, shop);
    if (cached) {
      console.log(`[TCS Token] Using cached token for ${username}@${shop}`);
      // Return a minimal object — baseUrl will be re-resolved on next full call
      return { token: cached, expiry: null, expiresAt: null, baseUrl: TCS_ENVIRONMENTS[0].baseUrl, gatewayToken };
    }
  }

  let lastError = null;

  for (const env of TCS_ENVIRONMENTS) {
    try {
      const gwToken = getGatewayToken(env.baseUrl);
      const res = await axios.get(`${env.baseUrl}/authentication/token`, {
        params: { username, password },
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${gwToken}`,
        },
        timeout: 8000,
      });

      const token = res.data?.accesstoken || res.data?.token;
      const expiryStr = res.data?.expiry;
      const expiresAt = parseExpiry(expiryStr);

      if (!token) {
        lastError = tcsError('TCS returned a response but no access token was present.', 'INVALID_CREDENTIALS');
        continue;
      }

      // Persist to cache
      if (shop) {
        await saveTokenToDb(username, shop, token, expiresAt);
      }

      console.log(`[TCS Token] Fresh token obtained from ${env.baseUrl}, expires: ${expiryStr || 'not specified'}`);
      return { token, expiry: expiryStr, expiresAt, baseUrl: env.baseUrl, gatewayToken };

    } catch (e) {
      lastError = classifyApiError(e, `auth on ${env.baseUrl}`);
      console.warn(`[TCS Token] GET token failed on ${env.baseUrl}:`, e.response?.data || e.message);
    }
  }

  throw lastError || tcsError('Failed to obtain access token from TCS.', 'NETWORK_ERROR', true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 helpers — cost center / pickup address processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a raw TCS cost center object into a consistent shape.
 */
function normalizeCostCenter(cc) {
  const code    = cc.costcentercode  || cc.CostCenterCode  || cc.code  || cc.Code  || cc.id  || '';
  const name    = cc.costcentername  || cc.CostCenterName  || cc.name  || cc.Name  || '';
  const city    = cc.costcentercity  || cc.CostCenterCity  || cc.city  || '';
  const address = cc.pickupaddress   || cc.PickupAddress   || cc.pickup_address || '';
  const retAddr = cc.returnaddress   || cc.ReturnAddress   || cc.return_address || '';
  const phone   = cc.phoneno         || cc.PhoneNo         || cc.phone  || '';
  const email   = cc.email           || cc.Email           || '';
  const pol     = cc.printonlabel    || cc.PrintOnLabel    || '';

  // Build human-readable label: "[CODE] Name — Address, City"
  let label = '';
  if (address) {
    label = address;
    if (city && !address.toUpperCase().includes(city.toUpperCase())) label += ', ' + city;
    if (name) label = name + ' \u2014 ' + label;
    if (code) label = '[' + code + '] ' + label;
  } else if (name) {
    label = code ? '[' + code + '] ' + name : name;
  } else {
    label = code || 'Unknown';
  }

  return {
    code,
    name,
    city,
    address,
    retAddr,
    phone,
    email,
    printOnLabel: pol === 'Y' || pol === true,
    label,
  };
}

/**
 * Extracts the detail array from the various response shapes TCS can return.
 */
function extractDetailArray(data) {
  if (!data) return [];
  if (Array.isArray(data.detail))      return data.detail;
  if (Array.isArray(data.costCenters)) return data.costCenters;
  if (Array.isArray(data.CostCenters)) return data.CostCenters;
  if (Array.isArray(data))             return data;
  if (typeof data === 'object') {
    const arrKey = Object.keys(data).find(k => Array.isArray(data[k]));
    if (arrKey) {
      console.log(`[TCS] Found array under response key: "${arrKey}"`);
      return data[arrKey];
    }
  }
  return [];
}

/**
 * Builds a deduplicated dropdown options array from raw API detail.
 * @returns {{ value: string, label: string, city: string }[]}
 */
function buildCostCenterDropdown(detail) {
  const seen = new Set();
  const options = [];
  for (const item of detail) {
    const cc = normalizeCostCenter(item);
    if (!cc.code) continue;
    if (seen.has(cc.code)) continue; // deduplicate
    seen.add(cc.code);
    options.push({ value: cc.code, label: cc.label, city: cc.city });
  }
  return options;
}

/**
 * Persists cost center rows to DB (UPSERT — safe to call repeatedly).
 */
async function saveCostCentersToDb(detail, accountNumber, shop) {
  for (const item of detail) {
    const cc = normalizeCostCenter(item);
    if (!cc.code) continue;
    try {
      await db.query(
        `INSERT INTO cost_centers
           (costcentercode, costcentername, costcentercity, pickup_address, return_address, phone, email, print_on_label, account_number, shop_domain, loaded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (costcentercode, account_number, shop_domain) DO UPDATE SET
           costcentername = EXCLUDED.costcentername,
           costcentercity = EXCLUDED.costcentercity,
           pickup_address = EXCLUDED.pickup_address,
           return_address = EXCLUDED.return_address,
           phone          = EXCLUDED.phone,
           email          = EXCLUDED.email,
           print_on_label = EXCLUDED.print_on_label,
           loaded_at      = NOW()`,
        [cc.code, cc.name, cc.city, cc.address, cc.retAddr, cc.phone, cc.email, cc.printOnLabel, accountNumber, shop]
      );
    } catch (err) {
      console.error(`[TCS DB] Failed to save cost center ${cc.code}:`, err.message);
    }
  }
}

/**
 * Persists pickup address rows to DB (UPSERT).
 * account_id resolved from tcs_accounts by accountNumber + shop.
 */
async function savePickupAddressesToDb(detail, accountNumber, shop) {
  // Resolve account_id
  let accountId = null;
  try {
    const acctRes = await db.query(
      'SELECT id FROM tcs_accounts WHERE account_number = $1 AND shop_domain = $2 LIMIT 1',
      [accountNumber, shop]
    );
    if (acctRes.rows.length > 0) accountId = acctRes.rows[0].id;
  } catch { /* non-fatal */ }

  for (const item of detail) {
    const cc = normalizeCostCenter(item);
    const addressId = cc.code || cc.name;
    if (!addressId) continue;
    try {
      await db.query(
        `INSERT INTO pickup_addresses
           (account_id, address_id, address_line, city, account_number, shop_domain, loaded_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (account_number, shop_domain, address_id) DO UPDATE SET
           address_line = EXCLUDED.address_line,
           city         = EXCLUDED.city,
           account_id   = EXCLUDED.account_id,
           loaded_at    = NOW()`,
        [accountId, addressId, cc.address, cc.city, accountNumber, shop]
      );
    } catch (err) {
      console.error(`[TCS DB] Failed to save pickup address ${addressId}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Fetch pickup addresses + cost centers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls TCS costcenterinquiry endpoint with the given token + account number.
 * Returns raw detail array.
 * Throws a classified tcsError on failure.
 */
async function callCostCenterInquiry(accessToken, accountNumber, baseUrl, gatewayToken) {
  const environments = baseUrl
    ? [{ baseUrl, gatewayToken }]
    : TCS_ENVIRONMENTS.map(e => ({ ...e, gatewayToken }));

  let lastError = null;

  for (const env of environments) {
    try {
      // TCS dual-auth: gateway token in Authorization header (authenticates the integration),
      // access token goes in query param (authenticates the TCS user account).
      const gwToken = getGatewayToken(env.baseUrl);

      const res = await axios.get(`${env.baseUrl}/inquiry/costcenterinquiry`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gwToken}`,
        },
        params: { accesstoken: accessToken, customerno: accountNumber },
        timeout: 8000,
      });

      const data = res.data;
      console.log('[TCS] Raw costcenterinquiry response keys:', data && typeof data === 'object' ? Object.keys(data) : typeof data);

      const detail = extractDetailArray(data);
      console.log(`[TCS] Extracted ${detail.length} cost center(s) from ${env.baseUrl}`);
      return { detail, rawResponse: data };

    } catch (e) {
      lastError = classifyApiError(e, `costcenterinquiry on ${env.baseUrl}`);
      console.warn(`[TCS] costcenterinquiry failed on ${env.baseUrl}:`, e.response?.data || e.message);
    }
  }

  throw lastError || tcsError('Failed to fetch pickup addresses from TCS.', 'NETWORK_ERROR', true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: fetchAndStorePickups
// Called by the /pickups route (Step 2 of the validation flow)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAndStorePickups({ username, password, accountNumber, accessToken, shop }) {
  if (!accountNumber) {
    throw tcsError('Account number is required to load pickup addresses.', 'ACCOUNT_NOT_FOUND', false);
  }

  // Use provided token, or fetch a fresh one
  let token = accessToken;
  let baseUrl = null;
  let gatewayToken = getGatewayToken();

  let dbPassword = password;
  if (!dbPassword && username && shop) {
    try {
      const acctRes = await db.query(
        'SELECT password FROM tcs_accounts WHERE username = $1 AND shop_domain = $2 LIMIT 1',
        [username, shop]
      );
      if (acctRes.rows.length > 0) {
        dbPassword = decrypt(acctRes.rows[0].password);
      }
    } catch (e) {
      console.warn('[fetchAndStorePickups] Could not load password from DB:', e.message);
    }
  }

  if (!token) {
    const authInfo = await getTcsToken(username, dbPassword || password, shop);
    token = authInfo.token;
    baseUrl = authInfo.baseUrl;
    gatewayToken = authInfo.gatewayToken;
  }

  // Call TCS API
  let detail, rawResponse;
  try {
    const res = await callCostCenterInquiry(token, accountNumber, baseUrl, gatewayToken);
    detail = res.detail;
    rawResponse = res.rawResponse;
  } catch (err) {
    if (err.tcsCode === 'TOKEN_EXPIRED' && username && (dbPassword || password)) {
      console.log(`[TCS Pickups] Token expired. Attempting to refresh token for ${username}...`);
      try {
        const authInfo = await getTcsToken(username, dbPassword || password, shop);
        token = authInfo.token;
        baseUrl = authInfo.baseUrl;
        gatewayToken = authInfo.gatewayToken;
        const res = await callCostCenterInquiry(token, accountNumber, baseUrl, gatewayToken);
        detail = res.detail;
        rawResponse = res.rawResponse;
      } catch (retryErr) {
        throw retryErr;
      }
    } else {
      throw err;
    }
  }

  if (!detail || detail.length === 0) {
    throw tcsError(
      'No pickup addresses returned by TCS. Please verify your account number or contact TCS support.',
      'EMPTY_RESPONSE',
      false
    );
  }

  // Build dropdown options (deduped)
  const costCenters = buildCostCenterDropdown(detail);

  // Persist to DB (non-fatal if DB is unavailable)
  try {
    await saveCostCentersToDb(detail, accountNumber, shop);
    await savePickupAddressesToDb(detail, accountNumber, shop);

    // Backward-compat: keep JSON blob on tcs_accounts updated
    const checkRes = await db.query(
      'SELECT id FROM tcs_accounts WHERE shop_domain = $1 AND account_number = $2',
      [shop, accountNumber]
    );
    if (checkRes.rows.length > 0) {
      await db.query(
        `UPDATE tcs_accounts
         SET access_token = $1, pickup_addresses_data = $2, updated_at = CURRENT_TIMESTAMP
         WHERE shop_domain = $3 AND account_number = $4`,
        [token, JSON.stringify(rawResponse), shop, accountNumber]
      );
    } else if (username) {
      const encryptedPassword = password ? encrypt(password) : '';
      await db.query(
        `INSERT INTO tcs_accounts
           (shop_domain, username, password, account_number, is_enabled, access_token, pickup_addresses_data)
         VALUES ($1,$2,$3,$4,true,$5,$6)`,
        [shop, username, encryptedPassword, accountNumber, token, JSON.stringify(rawResponse)]
      );
    }
  } catch (dbErr) {
    console.error('[TCS DB] Error persisting pickup data (non-fatal):', dbErr.message);
  }

  return {
    detail,
    costCenters,
    message: `${costCenters.length} pickup address(es) loaded successfully.`,
    traceid: rawResponse?.traceid || rawResponse?.traceId || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: validateAndFetchPickups (used by /validate route)
// ─────────────────────────────────────────────────────────────────────────────
async function validateAndFetchPickups({ username, password, accountNumber, shop }) {
  const { token, expiry, expiresAt, baseUrl, gatewayToken } = await getTcsToken(username, password, shop);

  const { detail, rawResponse } = await callCostCenterInquiry(token, accountNumber, baseUrl, gatewayToken);

  const costCenters = buildCostCenterDropdown(detail);

  // Legacy-compatible pickups array
  const pickups = detail.map(item => {
    const cc = normalizeCostCenter(item);
    return { id: cc.code || cc.name, name: cc.label };
  });

  return { accessToken: token, expiry, expiresAt, pickups, costCenters, detail };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: validateAndStoreAccount
// ─────────────────────────────────────────────────────────────────────────────
async function validateAndStoreAccount({ username, password, accountNumber, shop, is_default = false }) {
  const { accessToken, pickups } = await validateAndFetchPickups({ username, password, accountNumber, shop });
  const pickup_address = pickups && pickups.length > 0 ? pickups[0].id : null;
  const accountData = { shop, username, password, accountNumber, is_enabled: true, is_default, pickup_address, accessToken };
  const saved = await saveAccount(accountData);
  return saved;
}

// ─────────────────────────────────────────────────────────────────────────────
// Account CRUD
// ─────────────────────────────────────────────────────────────────────────────
async function saveAccount(data) {
  const {
    id, shop, username, password, accountNumber, is_enabled, is_default,
    pickup_address, default_weight, has_insurance, default_insurance,
    shipper_remarks, shipper_phone, service_type, is_fragile, label_print_option,
    auto_fulfillment, auto_save_tracking, mark_paid_zero, auto_calc_weight,
    auto_calc_pieces, add_order_notes, accessToken, pickupAddressesData,
  } = data;

  const encryptedPassword = password ? encrypt(password) : null;

  try {
    if (is_default) {
      await db.query('UPDATE tcs_accounts SET is_default = false WHERE shop_domain = $1', [shop]);
    }

    const values = [
      shop, username, encryptedPassword, accountNumber, is_enabled || false, is_default || false,
      pickup_address, default_weight || 0.5, has_insurance || false, default_insurance || null,
      shipper_remarks || '', shipper_phone || '', service_type || 'Express', is_fragile || false,
      label_print_option || 'Print Product Name Only',
      auto_fulfillment !== undefined ? auto_fulfillment : true,
      auto_save_tracking !== undefined ? auto_save_tracking : false,
      mark_paid_zero !== undefined ? mark_paid_zero : true,
      auto_calc_weight !== undefined ? auto_calc_weight : false,
      auto_calc_pieces !== undefined ? auto_calc_pieces : false,
      add_order_notes !== undefined ? add_order_notes : false,
      accessToken || null,
      pickupAddressesData || null,
    ];

    let result;
    if (id) {
      const updateQuery = `
        UPDATE tcs_accounts SET
          username = $2, password = COALESCE($3, password), account_number = $4,
          is_enabled = $5, is_default = $6, pickup_address = $7, default_weight = $8,
          has_insurance = $9, default_insurance = $10, shipper_remarks = $11,
          shipper_phone = $12, service_type = $13, is_fragile = $14, label_print_option = $15,
          auto_fulfillment = $16, auto_save_tracking = $17, mark_paid_zero = $18,
          auto_calc_weight = $19, auto_calc_pieces = $20, add_order_notes = $21,
          access_token = $22, pickup_addresses_data = $23, updated_at = CURRENT_TIMESTAMP
        WHERE id = $24 AND shop_domain = $1
        RETURNING id`;
      result = await db.query(updateQuery, [...values, id]);
    } else {
      const insertQuery = `
        INSERT INTO tcs_accounts (
          shop_domain, username, password, account_number, is_enabled, is_default,
          pickup_address, default_weight, has_insurance, default_insurance,
          shipper_remarks, shipper_phone, service_type, is_fragile, label_print_option,
          auto_fulfillment, auto_save_tracking, mark_paid_zero, auto_calc_weight,
          auto_calc_pieces, add_order_notes, access_token, pickup_addresses_data
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
        ) RETURNING id`;
      result = await db.query(insertQuery, values);
    }
    return { id: result.rows[0].id, success: true };
  } catch (error) {
    console.error('Error saving TCS account:', error);
    throw new Error('Database error saving account.');
  }
}

async function getAccounts(shop) {
  try {
    const res = await db.query(
      'SELECT * FROM tcs_accounts WHERE shop_domain = $1 ORDER BY created_at DESC',
      [shop]
    );
    return res.rows;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

async function deleteAccount(id, shop) {
  try {
    await db.query('DELETE FROM tcs_accounts WHERE id = $1 AND shop_domain = $2', [id, shop]);
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new Error('Failed to delete account');
  }
}

async function toggleAccountStatus(id, shop, isEnabled) {
  try {
    await db.query(
      'UPDATE tcs_accounts SET is_enabled = $1 WHERE id = $2 AND shop_domain = $3',
      [isEnabled, id, shop]
    );
  } catch (error) {
    console.error('Error toggling account status:', error);
    throw new Error('Failed to toggle account status');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────────────────────────────────────
async function bookShipment(payload) {
  const { shop, accountId, bookingDetails } = payload;

  const res = await db.query(
    'SELECT * FROM tcs_accounts WHERE id = $1 AND shop_domain = $2',
    [accountId, shop]
  );
  if (res.rows.length === 0) throw new Error('Invalid courier account specified.');

  const account = res.rows[0];
  const orderId = bookingDetails.orderId;

  const existingBooking = await bookingService.isOrderBooked(shop, orderId);
  if (existingBooking) {
    throw new Error(`Order #${orderId} is already booked with ${existingBooking.courier} (CN: ${existingBooking.tracking_number}).`);
  }

  try {
    const authInfo = await getTcsToken(account.username, decrypt(account.password), shop);
    const { token, baseUrl, gatewayToken } = authInfo;

    // ── Resolve shipper city from cost_centers table ───────────────────────────
    let shipperCityName = 'Karachi';
    let shipperAddress  = account.pickup_address || '';
    try {
      const ccRes = await db.query(
        `SELECT costcentercity, pickup_address FROM cost_centers
         WHERE account_number = $1 AND shop_domain = $2 AND costcentercode = $3
         LIMIT 1`,
        [account.account_number, shop, account.pickup_address]
      );
      if (ccRes.rows.length > 0) {
        shipperCityName = ccRes.rows[0].costcentercity || shipperCityName;
        shipperAddress  = ccRes.rows[0].pickup_address  || shipperAddress;
      }
    } catch (e) {
      console.warn('[TCS Booking] Could not resolve cost center city (non-fatal):', e.message);
    }

    // ── Parse consignee name into first / last ─────────────────────────────────
    const fullName  = (bookingDetails.consigneeName || '').trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || fullName || 'Customer';
    const lastName  = nameParts.slice(1).join(' ') || '';

    // ── Map service type to TCS service code ───────────────────────────────────
    // Account service_type: 'Express'→'O', 'Economy Express'→'E', 'Same Day'→'O', 'Overland'→'2'
    // BookingWorkbench per-order: 'O', '2', 'E'
    const serviceTypeRaw = bookingDetails.serviceType || account.service_type || 'Express';
    const svcMap = {
      'O': 'O', 'Express': 'O', 'Same Day': 'O',
      '2': '2', 'Overland': '2', 'Second Day': '2',
      'E': 'E', 'Economy Express': 'E', 'Economy': 'E',
    };
    const serviceCode = svcMap[serviceTypeRaw] || 'O';

    // ── Sanitize phone (TCS requires exactly 11 digits: 0300xxxxxxx) ──────────
    function sanitizePhone(phone) {
      if (!phone) return '03000000000';
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('0'))  return digits;
      if (digits.length === 10 && digits.startsWith('3'))  return '0' + digits;
      if (digits.length === 12 && digits.startsWith('92')) return '0' + digits.slice(2);
      return (digits + '00000000000').slice(0, 11);
    }

    // ── Build the official TCS booking payload ─────────────────────────────────
    const tcsPayload = {
      accesstoken:   token,
      consignmentno: '',
      shipperinfo: {
        tcsaccount:  account.account_number,
        shippername: account.username || shop,
        address1:    (shipperAddress || 'Default Address').slice(0, 120),
        address2:    '',
        address3:    '',
        zip:         '',
        countrycode: 'PK',
        countryname: 'Pakistan',
        citycode:    '',
        cityname:    shipperCityName.slice(0, 50),
        mobile:      sanitizePhone(account.shipper_phone || ''),
      },
      consigneeinfo: {
        consigneecode: '',
        firstname:     firstName.slice(0, 50),
        middlename:    '',
        lastname:      lastName.slice(0, 50),
        address1:      (bookingDetails.consigneeAddress || 'Not Provided').slice(0, 120),
        address2:      '',
        address3:      '',
        zip:           '',
        countrycode:   'PK',
        countryname:   'Pakistan',
        citycode:      '',
        cityname:      (bookingDetails.consigneeCity || 'Karachi').slice(0, 50),
        email:         (bookingDetails.consigneeEmail || '').slice(0, 50),
        areacode:      '',
        areaname:      '',
        blockcode:     '',
        blockname:     '',
        lat:           '',
        lng:           '',
        landmark:      '',
        mobile:        sanitizePhone(bookingDetails.consigneePhone),
      },
      shipmentinfo: {
        costcentercode:  account.pickup_address || '',
        referenceno:     (orderId || '').slice(0, 50),
        contentdesc:     (bookingDetails.productDesc || 'Goods').slice(0, 99),
        servicecode:     serviceCode,
        parametertype:   '',
        shipmentdate:    '',
        shippingtype:    '',
        currency:        'PKR',
        codamount:       parseInt(parseFloat(bookingDetails.codAmount) || 0),
        declaredvalue:   null,
        insuredvalue:    account.has_insurance ? parseInt(parseFloat(account.default_insurance) || 0) : null,
        transactiontype: '',
        dsflag:          '',
        carrierslug:     '',
        weightinkg:      Math.max(0.5, parseFloat(bookingDetails.weight) || parseFloat(account.default_weight) || 0.5),
        pieces:          Math.max(1, parseInt(bookingDetails.pieces) || 1),
        fragile:         account.is_fragile || false,
        remarks:         (bookingDetails.remarks || account.shipper_remarks || '').slice(0, 499),
        skus:            [],
      },
    };

    console.log('[TCS Booking] Payload to TCS:', JSON.stringify(tcsPayload, null, 2));

    // Try all env URLs if no baseUrl was resolved from the token
    const envUrls = baseUrl
      ? [baseUrl]
      : TCS_ENVIRONMENTS.map(e => e.baseUrl);

    let data = null;
    let lastErr = null;
    for (const url of envUrls) {
      try {
        // TCS dual-auth: gateway token in Authorization header (authenticates the integration),
        // access token goes in the JSON body field `accesstoken` (authenticates the TCS user).
        const gwToken = getGatewayToken(url);

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gwToken}`
        };

        const response = await axios.post(`${url}/booking/create`, tcsPayload, { headers, timeout: 15000 });
        data = response.data;
        console.log('[TCS Booking] Response from', url, ':', JSON.stringify(data));
        break;
      } catch (e) {
        lastErr = e;
        console.warn(`[TCS Booking] Failed on ${url}:`, e.response?.data || e.message);
      }
    }

    if (!data) {
      const errMsg = lastErr?.response?.data?.message || lastErr?.message || 'Failed to create booking on TCS.';
      throw new Error(errMsg);
    }

    // Per TCS spec, success response: { consignmentNo, message, traceid }
    const consignmentNo = data.consignmentNo || data.consignmentno || data.trackingNumber || data.cn;
    const traceid       = data.traceid || data.traceId || null;

    if (!consignmentNo) {
      const apiMsg = data.message || data.error || JSON.stringify(data);
      throw new Error(`TCS did not return a consignment number. Response: ${apiMsg}`);
    }

    console.log(`[TCS Booking] Booked! CN: ${consignmentNo}, TraceID: ${traceid}`);

    await bookingService.saveBooking({
      shop,
      orderId:        bookingDetails.orderId,
      courier:        'TCS',
      trackingNumber: consignmentNo,
      traceid,
      consigneeName:  bookingDetails.consigneeName,
      consigneePhone: bookingDetails.consigneePhone,
      consigneeCity:  bookingDetails.consigneeCity,
      codAmount:      parseFloat(bookingDetails.codAmount),
      orderAmount:    parseFloat(bookingDetails.orderAmount || bookingDetails.codAmount),
      accountId,
    });

    let fulfillment = null;
    if (account.auto_fulfillment) {
      try {
        fulfillment = await shopifyService.fulfillOrder(shop, bookingDetails.orderId, consignmentNo, 'TCS');
        if (!fulfillment.success) {
          console.error('[TCS Booking] Shopify fulfillment failed (booking still saved):', fulfillment.error);
        }
      } catch (err) {
        console.error('[TCS Booking] Failed to fulfill order on Shopify (non-fatal):', err.message);
        fulfillment = { success: false, error: err.message };
      }
    } else {
      console.log('[TCS Booking] auto_fulfillment disabled for account; skipping Shopify fulfillment.');
      fulfillment = { success: false, skipped: true, error: 'auto_fulfillment disabled for this account' };
    }

    return { success: true, trackingNumber: consignmentNo, consignmentNo, traceid, fulfillment };

  } catch (error) {
    console.error('TCS Booking Error:', error.response?.data || error.message);
    throw new Error('Failed to book shipment with TCS: ' + (error.response?.data?.message || error.message));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loadsheets
// ─────────────────────────────────────────────────────────────────────────────
async function fetchLoadsheets(shop, fromDate, toDate) {
  const accounts = await getAccounts(shop);
  const activeAccount = accounts.find(a => a.is_default && a.is_enabled) || accounts[0];
  if (!activeAccount) throw new Error('No active TCS account found.');

  const { token, baseUrl, gatewayToken } = await getTcsToken(
    activeAccount.username,
    decrypt(activeAccount.password),
    shop
  );

  try {
    // TCS dual-auth: gateway token in Authorization header, access token in params.
    const gwToken = getGatewayToken(baseUrl);
    const headers = {
      'Authorization': `Bearer ${gwToken}`
    };
    const response = await axios.get(`${baseUrl}/report/loadsheetlogs`, {
      headers,
      params: { accesstoken: token, customerno: activeAccount.account_number, fromdate: fromDate, todate: toDate },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching loadsheets:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  getTcsToken,
  saveTokenToDb,
  fetchAndStorePickups,
  validateAndFetchPickups,
  validateAndStoreAccount,
  buildCostCenterDropdown,
  saveAccount,
  getAccounts,
  deleteAccount,
  toggleAccountStatus,
  bookShipment,
  fetchLoadsheets,
};
