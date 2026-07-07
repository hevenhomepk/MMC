// src/server/services/trackingService.js
// Background tracking poller: re-checks non-terminal TCS shipments, persists the
// derived status + cached timeline, and pushes updates to Shopify (fulfillment
// event + order tag) until each shipment reaches Delivered or Return to Shipper.
const tcsService     = require('./tcsService');
const bookingService = require('./bookingService');
const shopifyService = require('./shopifyService');

let isRunning = false;

/**
 * Tracks bookings for a single shop and syncs changes to Shopify.
 * @param {string} shop
 * @param {object} [opts]
 * @param {string[]} [opts.cns] Limit to these consignment numbers (on-demand Track
 *        button). When omitted, tracks all active (non-terminal) bookings (poller).
 * @returns {Promise<{shop, checked, updated, terminal, errors, results}>}
 *   `results` is a per-CN array for the UI: { cn, orderId, status, code, statusDateTime, isTerminal, found, notFound, detail }.
 */
async function pollShopTracking(shop, opts = {}) {
  const summary = { shop, checked: 0, updated: 0, terminal: 0, errors: 0, results: [] };
  if (!shop) return summary;

  const bookings = (opts.cns && opts.cns.length)
    ? await bookingService.getBookingsByTrackingNumbers(shop, opts.cns)
    : await bookingService.getActiveBookingsForTracking(shop);
  if (bookings.length === 0) return summary;

  // Map CN → booking row (a CN is unique per shipment).
  const byCn = new Map();
  for (const b of bookings) {
    const cn = String(b.tracking_number || '').trim();
    if (cn) byCn.set(cn, b);
  }
  const cns = [...byCn.keys()];
  summary.checked = cns.length;

  let tracked;
  try {
    tracked = await tcsService.trackConsignments(cns);
  } catch (e) {
    console.error(`[Tracking] trackConsignments failed for ${shop}:`, e.message);
    summary.errors += cns.length;
    return summary;
  }

  for (const [cn, perCn] of tracked) {
    const booking = byCn.get(cn);
    if (!booking) continue;
    if (perCn.notFound) {
      // No tracking data yet — report it so the UI can show "no info yet".
      summary.results.push({ cn, orderId: booking.order_id, status: booking.status, found: false, notFound: true, detail: null });
      continue;
    }

    try {
      const derived = tcsService.deriveStatus(perCn);
      const detail = {
        shipmentinfo:    perCn.shipmentinfo || null,
        deliveryinfo:    perCn.deliveryinfo || [],
        checkpoints:     perCn.checkpoints || [],
        shipmentsummary: perCn.shipmentsummary || null,
      };
      summary.results.push({
        cn, orderId: booking.order_id,
        status: derived.status, code: derived.code, statusDateTime: derived.statusDateTime,
        isTerminal: derived.isTerminal, found: derived.found, detail,
      });
      if (!derived.found) continue;

      const statusChanged = derived.status && derived.status !== booking.status;

      // Persist the derived status + full cached timeline (used by the UI modal).
      await bookingService.updateTrackingStatus(booking.id, {
        status:         derived.status,
        statusCode:     derived.code,
        trackingDetail: JSON.stringify(detail),
        lastTrackedAt:  new Date(),
        deliveredAt:    derived.isDelivered ? (tcsService.parseTrackDate(derived.statusDateTime) || new Date()) : null,
      });

      if (statusChanged) summary.updated++;
      if (derived.isTerminal) summary.terminal++;

      // ── Sync to Shopify only when the mapped event actually changed ───────────
      const eventStatus = tcsService.normalizeStatusToShopifyEvent(derived.status, derived.code);
      if (eventStatus && eventStatus !== booking.last_shopify_event) {
        const result = await shopifyService.updateOrderStatus(shop, booking.order_id, {
          eventStatus,
          tag: derived.status,                 // human-readable tag, e.g. "Delivered"
          fulfillmentId: booking.fulfillment_id || undefined,
        });
        if (result.success) {
          // Record the pushed event so we don't post duplicates next cycle.
          await bookingService.updateTrackingStatus(booking.id, { lastShopifyEvent: eventStatus });
        } else {
          console.warn(`[Tracking] Shopify sync for ${booking.order_id} (${cn}) did not fully succeed:`, result.error || result);
        }
      }
    } catch (e) {
      summary.errors++;
      console.error(`[Tracking] Error processing CN ${cn} (${shop}):`, e.message);
    }
  }

  console.log(`[Tracking] ${shop}: checked ${summary.checked}, updated ${summary.updated}, terminal ${summary.terminal}, errors ${summary.errors}`);
  return summary;
}

/**
 * Polls every shop that has active bookings. Overlap-guarded and non-fatal.
 */
async function pollAllShops() {
  if (isRunning) {
    console.log('[Tracking] Previous poll still running — skipping this cycle.');
    return;
  }
  isRunning = true;
  const started = Date.now();
  try {
    const shops = await bookingService.getShopsWithActiveBookings();
    if (shops.length === 0) {
      console.log('[Tracking] No active bookings to track.');
      return;
    }
    console.log(`[Tracking] Polling ${shops.length} shop(s)...`);
    for (const shop of shops) {
      try {
        await pollShopTracking(shop);
      } catch (e) {
        console.error(`[Tracking] Shop poll failed for ${shop}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[Tracking] pollAllShops failed:', e.message);
  } finally {
    isRunning = false;
    console.log(`[Tracking] Cycle finished in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  }
}

/**
 * Starts the interval poller. Controlled by env:
 *   TCS_TRACK_ENABLED   ('false' disables; default enabled)
 *   TCS_TRACK_POLL_MINUTES (default 120)
 */
function startPoller() {
  if (process.env.TCS_TRACK_ENABLED === 'false') {
    console.log('[Tracking] Poller disabled via TCS_TRACK_ENABLED=false.');
    return;
  }
  const minutes = Math.max(1, parseInt(process.env.TCS_TRACK_POLL_MINUTES || '120', 10) || 120);
  const intervalMs = minutes * 60 * 1000;

  // One delayed run shortly after boot, then on the configured interval.
  setTimeout(() => { pollAllShops().catch(e => console.error('[Tracking] boot run error:', e.message)); }, 30_000);
  setInterval(() => { pollAllShops().catch(e => console.error('[Tracking] interval run error:', e.message)); }, intervalMs);

  console.log(`[Tracking] Poller started (every ${minutes} min).`);
}

module.exports = {
  pollShopTracking,
  pollAllShops,
  startPoller,
};
