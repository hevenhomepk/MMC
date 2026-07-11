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

    // ── 1. Obtain the Access Code from .env ──────────────────────────────────
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!accessToken) {
      console.log('[shopifyService] No SHOPIFY_ADMIN_ACCESS_TOKEN found. Prompting OAuth.');
      return { requireAuth: true };
    }

    // ── 2. Call the Shopify Orders REST API ───────────────────────────────────
    const response = await axios.get(
      `https://${shop}/admin/api/2025-01/orders.json`,
      {
        params: {
          fulfillment_status: 'unfulfilled',
          status:             'any',   // 'any' includes payment_pending orders from Draft Orders channel
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
      if (error.response.status === 401) {
        console.log('[shopifyService] Token invalid (401). Prompting OAuth.');
        return { requireAuth: true };
      }
      // Return the error message from Shopify API
      throw new Error(`Shopify API Error (${error.response.status}): ${JSON.stringify(error.response.data.errors || error.response.data)}`);
    }
    throw error;
  }
}
/**
 * Fulfills an order on Shopify by creating a fulfillment against its fulfillment orders.
 *
 * @param {string} shop         Shopify store domain, e.g. "luxessentials-qwfswl1g.myshopify.com"
 * @param {string} orderName    Shopify order name, e.g. "#1002"
 * @param {string} trackingNum  Courier tracking/consignment number
 * @param {string} courierName  Courier company name (e.g. "TCS" or "PostEx")
 * @returns {Promise<Object>}   The Shopify API response data
 */
async function fulfillOrder(shop, orderName, trackingNum, courierName) {
  try {
    if (!shop || !orderName || !trackingNum) {
      console.error('[shopifyService] Missing required parameters for fulfillOrder');
      return { success: false, error: 'Missing required parameters' };
    }

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('[shopifyService] No SHOPIFY_ADMIN_ACCESS_TOKEN found. Cannot fulfill.');
      return { success: false, error: 'No access token' };
    }

    console.log(`[shopifyService] Beginning fulfillment for order ${orderName} (${courierName}) with CN: ${trackingNum}`);

    // 1. Resolve numeric order ID by order name
    const orderSearchRes = await axios.get(
      `https://${shop}/admin/api/2025-01/orders.json`,
      {
        params: {
          name: orderName,
          status: 'any',
          limit: 1,
        },
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const orders = orderSearchRes.data?.orders || [];
    if (orders.length === 0) {
      console.error(`[shopifyService] Order not found with name: ${orderName}`);
      return { success: false, error: `Order ${orderName} not found` };
    }

    const shopifyOrder = orders[0];
    const orderId = shopifyOrder.id;

    // 2. Fetch fulfillment orders
    const foResponse = await axios.get(
      `https://${shop}/admin/api/2025-01/orders/${orderId}/fulfillment_orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const fulfillmentOrders = foResponse.data?.fulfillment_orders || [];
    const fulfillable = fulfillmentOrders.filter(
      fo => fo.status === 'open' || fo.status === 'in_progress'
    );

    if (fulfillable.length === 0) {
      console.log(`[shopifyService] Order ${orderName} has no open/in_progress fulfillment orders. Already fulfilled?`);
      return { success: true, message: 'No open fulfillment orders to fulfill' };
    }

    // 3. Create tracking info and payload
    let trackingUrl = '';
    let trackingCompany = courierName;
    if (courierName.toLowerCase() === 'tcs') {
      trackingUrl = `https://www.tcsexpress.com/track/`;
      trackingCompany = 'TCS';
    } else if (courierName.toLowerCase() === 'postex') {
      trackingUrl = `https://postex.pk/tracking`;
      trackingCompany = 'PostEx';
    }

    const lineItemsByFulfillmentOrder = fulfillable.map(fo => ({
      fulfillment_order_id: fo.id,
    }));

    const fulfillmentPayload = {
      fulfillment: {
        line_items_by_fulfillment_order: lineItemsByFulfillmentOrder,
        tracking_info: {
          number: trackingNum.toString(),
          url: trackingUrl,
          company: trackingCompany,
        },
        notify_customer: true,
      },
    };

    console.log(`[shopifyService] Creating fulfillment for ${orderName}...`);
    const response = await axios.post(
      `https://${shop}/admin/api/2025-01/fulfillments.json`,
      fulfillmentPayload,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[shopifyService] Successfully fulfilled ${orderName} on Shopify.`);
    return { success: true, data: response.data };

  } catch (error) {
    console.error(`[shopifyService] Error fulfilling order ${orderName}:`, error.message);
    let detail = error.message;
    if (error.response) {
      const status = error.response.status;
      const body = JSON.stringify(error.response.data?.errors || error.response.data);
      console.error('[shopifyService] Shopify API responded with:', status, body);
      detail = `Shopify API ${status}: ${body}`;
      if (status === 401 || status === 403) {
        detail += ' — the Admin API access token is missing fulfillment write scopes ' +
          '(write_merchant_managed_fulfillment_orders / write_fulfillments). ' +
          'Grant these to the custom app in the Shopify admin and reinstall/regenerate the token.';
      }
    }
    return { success: false, error: detail, status: error.response?.status };
  }
}

/**
 * Resolves a Shopify order by its name (e.g. "#1002"). Returns the order object or null.
 */
async function findOrderByName(shop, orderName, accessToken) {
  const res = await axios.get(
    `https://${shop}/admin/api/2025-01/orders.json`,
    {
      params: { name: orderName, status: 'any', limit: 1 },
      headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
    }
  );
  const orders = res.data?.orders || [];
  return orders.length > 0 ? orders[0] : null;
}

/**
 * Pushes a courier status to Shopify: posts a fulfillment event (buyer-facing
 * tracking timeline) and adds an order tag (merchant admin filtering).
 * Never throws — the tracking poller must stay alive. Returns a result summary.
 *
 * @param {string} shop
 * @param {string} orderName       Shopify order name, e.g. "#1002"
 * @param {object} opts
 * @param {string} opts.eventStatus   Shopify fulfillment-event status (in_transit, delivered, ...)
 * @param {string} [opts.tag]         Order tag to add (e.g. "Delivered")
 * @param {string} [opts.fulfillmentId] Known fulfillment id (avoids a lookup)
 */
async function updateOrderStatus(shop, orderName, { eventStatus, tag, fulfillmentId } = {}) {
  const outcome = { success: false, eventPosted: false, tagAdded: false };
  try {
    if (!shop || !orderName) return { ...outcome, error: 'Missing shop or orderName' };

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!accessToken) return { ...outcome, error: 'No access token' };

    const order = await findOrderByName(shop, orderName, accessToken);
    if (!order) return { ...outcome, error: `Order ${orderName} not found` };
    const orderId = order.id;

    const headers = { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' };

    // ── 1. Fulfillment event (buyer-facing) ─────────────────────────────────────
    if (eventStatus) {
      try {
        let fid = fulfillmentId;
        if (!fid) {
          const fRes = await axios.get(
            `https://${shop}/admin/api/2025-01/orders/${orderId}/fulfillments.json`,
            { headers }
          );
          const fulfillments = fRes.data?.fulfillments || [];
          if (fulfillments.length > 0) fid = fulfillments[fulfillments.length - 1].id;
        }
        if (fid) {
          await axios.post(
            `https://${shop}/admin/api/2025-01/fulfillments/${fid}/events.json`,
            { event: { status: eventStatus } },
            { headers }
          );
          outcome.eventPosted = true;
          outcome.fulfillmentId = fid;
        } else {
          // No fulfillment exists (e.g. auto_fulfillment was off) — event is not possible.
          outcome.eventSkipped = 'no fulfillment on order';
        }
      } catch (e) {
        console.warn(`[shopifyService] Fulfillment event (${eventStatus}) failed for ${orderName}:`, e.response?.status || '', JSON.stringify(e.response?.data?.errors || e.message));
        outcome.eventError = e.response?.data?.errors || e.message;
      }
    }

    // ── 2. Order tag (merchant-facing) ──────────────────────────────────────────
    if (tag) {
      try {
        const existing = (order.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        if (!existing.some(t => t.toLowerCase() === tag.toLowerCase())) {
          existing.push(tag);
          await axios.put(
            `https://${shop}/admin/api/2025-01/orders/${orderId}.json`,
            { order: { id: orderId, tags: existing.join(', ') } },
            { headers }
          );
          outcome.tagAdded = true;
        } else {
          outcome.tagAdded = false;
          outcome.tagExisted = true;
        }
      } catch (e) {
        console.warn(`[shopifyService] Tag update ("${tag}") failed for ${orderName}:`, e.response?.status || '', JSON.stringify(e.response?.data?.errors || e.message));
        outcome.tagError = e.response?.data?.errors || e.message;
      }
    }

    outcome.success = true;
    return outcome;
  } catch (error) {
    console.error(`[shopifyService] updateOrderStatus error for ${orderName}:`, error.message);
    return { ...outcome, error: error.message };
  }
}

/**
 * Cancels the fulfillment(s) on a Shopify order, reverting it to "unfulfilled".
 * Used by the "Delete / revert to Unfulfilled" action so a booked order returns
 * to the Booking Workbench. Also strips any courier-status tags we added.
 * Never throws — returns a result summary the caller can inspect per order.
 *
 * @param {string} shop
 * @param {string} orderName          Shopify order name, e.g. "#1002"
 * @param {object} opts
 * @param {string} [opts.fulfillmentId] Known fulfillment id (skips a lookup)
 * @param {string[]} [opts.removeTags]  Order tags to strip (e.g. the courier status)
 */
async function cancelFulfillment(shop, orderName, { fulfillmentId, removeTags } = {}) {
  const outcome = { success: false, cancelled: false, tagsRemoved: false };
  try {
    if (!shop || !orderName) return { ...outcome, error: 'Missing shop or orderName' };

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!accessToken) return { ...outcome, error: 'No access token' };

    const headers = { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' };

    const order = await findOrderByName(shop, orderName, accessToken);
    if (!order) return { ...outcome, error: `Order ${orderName} not found` };
    const orderId = order.id;

    // ── 1. Cancel fulfillment(s) → returns line items to unfulfilled ────────────
    let fids = [];
    if (fulfillmentId) {
      fids = [fulfillmentId];
    } else {
      const fRes = await axios.get(
        `https://${shop}/admin/api/2025-01/orders/${orderId}/fulfillments.json`,
        { headers }
      );
      fids = (fRes.data?.fulfillments || [])
        .filter(f => f.status !== 'cancelled')
        .map(f => f.id);
    }

    if (fids.length === 0) {
      // Nothing fulfilled on Shopify (already unfulfilled) — treat as success so the
      // local booking can still be removed.
      outcome.alreadyUnfulfilled = true;
    }

    for (const fid of fids) {
      try {
        await axios.post(
          `https://${shop}/admin/api/2025-01/fulfillments/${fid}/cancel.json`,
          {},
          { headers }
        );
        outcome.cancelled = true;
      } catch (e) {
        console.warn(`[shopifyService] Cancel fulfillment ${fid} failed for ${orderName}:`, e.response?.status || '', JSON.stringify(e.response?.data?.errors || e.message));
        outcome.cancelError = e.response?.data?.errors || e.message;
      }
    }

    // ── 2. Remove courier-status tags we added (best-effort) ────────────────────
    if (removeTags && removeTags.length) {
      try {
        const rmSet = new Set(removeTags.filter(Boolean).map(t => String(t).toLowerCase()));
        const existing = (order.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        const kept = existing.filter(t => !rmSet.has(t.toLowerCase()));
        if (kept.length !== existing.length) {
          await axios.put(
            `https://${shop}/admin/api/2025-01/orders/${orderId}.json`,
            { order: { id: orderId, tags: kept.join(', ') } },
            { headers }
          );
          outcome.tagsRemoved = true;
        }
      } catch (e) {
        console.warn(`[shopifyService] Tag removal failed for ${orderName}:`, e.response?.status || '', JSON.stringify(e.response?.data?.errors || e.message));
        outcome.tagError = e.response?.data?.errors || e.message;
      }
    }

    // Success if we cancelled something, or there was nothing to cancel, and no hard cancel error blocked it.
    outcome.success = outcome.cancelled || outcome.alreadyUnfulfilled === true;
    if (!outcome.success && outcome.cancelError) outcome.error = 'Failed to cancel fulfillment on Shopify';
    return outcome;
  } catch (error) {
    console.error(`[shopifyService] cancelFulfillment error for ${orderName}:`, error.message);
    return { ...outcome, error: error.message };
  }
}

module.exports = {
  getUnfulfilledOrders,
  fulfillOrder,
  updateOrderStatus,
  cancelFulfillment,
};
