// src/server/services/shopifyService.js
const db    = require('../db');
const axios = require('axios');
const path  = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Access-token helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the Shopify OAuth access token for a given shop from the Prisma-managed
 * SQLite session store (mmc/prisma/dev.sqlite).
 *
 * The Shopify session library stores offline tokens with:
 *   id   = "offline_<shop>"   (preferred)
 *   shop = "<shop>"           (fallback: most-recent row)
 *
 * @param {string} shop  e.g. "teststore.myshopify.com"
 * @returns {string|null}
 */
function getAccessTokenFromSQLite(shop) {
  try {
    // Resolve the path relative to this file's location:
    // this file  → src/server/services/shopifyService.js
    // SQLite DB  → mmc/prisma/dev.sqlite  (3 dirs up, then mmc/prisma)
    const dbPath = path.resolve(__dirname, '../../../mmc/prisma/dev.sqlite');

    // Use better-sqlite3 if available (synchronous, no extra deps needed)
    // eslint-disable-next-line global-require
    const Database = require('better-sqlite3');
    const sqlite   = new Database(dbPath, { readonly: true });

    // 1️⃣  Prefer the offline-token row
    let row = sqlite.prepare(
      `SELECT accessToken FROM Session WHERE id = ? LIMIT 1`
    ).get(`offline_${shop}`);

    // 2️⃣  Fallback: latest row for the shop
    if (!row) {
      row = sqlite.prepare(
        `SELECT accessToken FROM Session WHERE shop = ? ORDER BY rowid DESC LIMIT 1`
      ).get(shop);
    }

    sqlite.close();
    return row ? row.accessToken : null;

  } catch (err) {
    console.error('[shopifyService] SQLite token read failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all UNFULFILLED orders for a shop from the Shopify REST API.
 *
 * Intentionally does NOT filter by financial_status so that COD orders
 * (payment_status = "pending") are included alongside prepaid orders.
 *
 * @param {string} shop  Shopify store domain, e.g. "mystore.myshopify.com"
 * @returns {Promise<Object[]>}
 */
async function getUnfulfilledOrders(shop) {
  try {
    if (!shop) {
      console.error('[shopifyService] shop parameter is required.');
      return [];
    }

    // ── 1. Obtain the OAuth access token ─────────────────────────────────────
    const accessToken = getAccessTokenFromSQLite(shop);

    if (!accessToken) {
      console.error(
        `[shopifyService] No Shopify access token found for "${shop}". ` +
        'Please re-install (re-authenticate) the app to generate a new token.'
      );
      return [];
    }

    // ── 2. Call the Shopify Orders REST API ───────────────────────────────────
    //  ✅  fulfillment_status=unfulfilled  → correct param name
    //  ✅  status=open                     → only active orders
    //  ❌  financial_status NOT included   → COD orders always show "pending";
    //                                        excluding them would hide all COD orders
    const response = await axios.get(
      `https://${shop}/admin/api/2025-01/orders.json`,
      {
        params: {
          fulfillment_status: 'unfulfilled',
          status:             'open',
          limit:              250,          // maximum page size
        },
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type':           'application/json',
        },
      }
    );

    const shopifyOrders = response.data.orders || [];
    console.log(`[shopifyService] Fetched ${shopifyOrders.length} unfulfilled orders for ${shop}`);

    // ── 3. Map Shopify order fields → our unified application structure ───────
    const rawOrders = shopifyOrders.map(order => {
      const shipping = order.shipping_address || {};
      const customer = order.customer        || {};

      const firstName   = shipping.first_name || customer.first_name || '';
      const lastName    = shipping.last_name  || customer.last_name  || '';
      const fullName    = shipping.name || `${firstName} ${lastName}`.trim();

      const address1    = shipping.address1 || '';
      const address2    = shipping.address2 || '';
      const fullAddress = [address1, address2].filter(Boolean).join(', ');

      const totalWeightGrams = order.total_weight || 0;
      const weightKg = (totalWeightGrams / 1000).toFixed(2);

      const pieces        = order.line_items
        ? order.line_items.reduce((acc, item) => acc + item.quantity, 0)
        : 1;
      const lineItemsDesc = order.line_items
        ? order.line_items.map(i => `${i.quantity}x ${i.name}`).join(', ')
        : '';

      return {
        id:               order.admin_graphql_api_id || `gid://shopify/Order/${order.id}`,
        order_number:     order.name || `#${order.order_number}`,
        customer_name:    fullName,
        mobile:           shipping.phone || customer.phone || '',
        city:             shipping.city  || '',
        address:          fullAddress,
        email:            order.email || customer.email || '',
        // COD amount: use total_price (financial_status is informational only)
        total_price:      order.current_total_price || order.total_price || '0.00',
        created_at:       order.created_at,
        line_items:       lineItemsDesc,
        service_type:     'O',        // Default: Overnight
        insurance:        '0.00',
        fragile:          false,
        weight:           weightKg > 0 ? weightKg : '0.5',
        pieces:           pieces.toString(),
        remarks:          order.note || '',
        // Informational only — not used for filtering
        financial_status: order.financial_status || '',
      };
    });

    // ── 4. Mark orders that already have a booking (tracking number) ──────────
    const existingBookingsRes = await db.query(
      `SELECT order_id, tracking_number FROM bookings WHERE shop_domain = $1`,
      [shop]
    );

    const bookedMap = {};
    existingBookingsRes.rows.forEach(row => {
      bookedMap[row.order_id] = row.tracking_number;
    });

    return rawOrders.map(order => ({
      ...order,
      tracking_number: bookedMap[order.order_number] || null,
    }));

  } catch (error) {
    console.error('[shopifyService] Error fetching orders:', error.message);
    if (error.response) {
      console.error(
        '[shopifyService] Shopify API responded with:',
        error.response.status,
        JSON.stringify(error.response.data)
      );
    }
    return [];
  }
}

module.exports = { getUnfulfilledOrders };
