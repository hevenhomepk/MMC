// src/server/services/shopifyService.js
const db    = require('../db');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all UNFULFILLED orders for a shop from the Shopify REST API.
 * Uses a Custom App Access Token stored in the .env file.
 *
 * @param {string} shop  Shopify store domain, e.g. "luxessentials-qwfswl1g.myshopify.com"
 * @returns {Promise<Object[]>}
 */
async function getUnfulfilledOrders(shop) {
  try {
    if (!shop) {
      console.error('[shopifyService] shop parameter is required.');
      return [];
    }

    // ── 1. Obtain the Custom App Access Token from .env ──────────────────────
    const accessToken = process.env.SHOPIFY_CUSTOM_APP_TOKEN;

    if (!accessToken) {
      console.error(
        `[shopifyService] No SHOPIFY_CUSTOM_APP_TOKEN found in .env! ` +
        'Please generate a Custom App token in Shopify Admin and add it to your .env file.'
      );
      return [];
    }

    // ── 2. Call the Shopify Orders REST API ───────────────────────────────────
    const response = await axios.get(
      `https://${shop}/admin/api/2025-01/orders.json`,
      {
        params: {
          fulfillment_status: 'unfulfilled',
          status:             'open',
          limit:              250,
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
        total_price:      order.current_total_price || order.total_price || '0.00',
        created_at:       order.created_at,
        line_items:       lineItemsDesc,
        service_type:     'O',
        insurance:        '0.00',
        fragile:          false,
        weight:           weightKg > 0 ? weightKg : '0.5',
        pieces:           pieces.toString(),
        remarks:          order.note || '',
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
