// src/server/routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const shopifyService = require('../services/shopifyService');

// The app statuses that can be applied to a booking via the "Change Status" action.
const APP_STATUSES = ['Booked', 'Shipped', 'Loadsheet', 'Assigned', 'Pending', 'Refused', 'Delivered', 'Returned', 'RTS', 'Cancelled'];
// Sentinel status that means: revert the order to Unfulfilled (cancel the Shopify
// fulfillment + remove the local booking) rather than store it as a status.
const UNFULFILL = 'Unfulfilled';

router.get('/', async (req, res) => {
  try {
    const bookings = await bookingService.getAllBookings(req.query.shop);
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/scan', async (req, res) => {
  try {
    const { shop, courier, tracking } = req.query;
    if (!shop || !courier || !tracking) {
      return res.status(400).json({ success: false, error: 'Missing shop, courier, or tracking parameter' });
    }
    const booking = await bookingService.findBookingByTrackingForLoadsheet(shop, courier, tracking);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found, invalid courier, or already in a loadsheet' });
    }
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Bulk change status for selected bookings (Actions → Change Status).
// Body: { shop, ids: number[], status }
//   status === 'Unfulfilled'  → cancel the Shopify fulfillment (revert order to
//                               unfulfilled) AND delete the local booking.
//   any other app status      → just update the local booking's status.
// Returns a per-order results array so the UI can report partial failures.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/change-status', async (req, res) => {
  try {
    const { shop, ids, status } = req.body || {};
    if (!shop) return res.status(400).json({ success: false, error: 'shop is required' });
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No orders selected' });
    }
    if (status !== UNFULFILL && !APP_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    const bookings = await bookingService.getBookingsByIds(shop, ids);
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching bookings found' });
    }

    const results = [];

    for (const b of bookings) {
      if (status === UNFULFILL) {
        // 1. Revert on Shopify (cancel fulfillment + strip the courier-status tag).
        const shopifyRes = await shopifyService.cancelFulfillment(shop, b.order_id, {
          fulfillmentId: b.fulfillment_id || undefined,
          removeTags: [b.status].filter(Boolean),
        });
        // 2. Remove the local booking so the order returns to the Unfulfilled list.
        //    Only delete if Shopify was reverted (or there was nothing to revert),
        //    so a failed Shopify call doesn't silently lose the booking.
        let localDeleted = false;
        if (shopifyRes.success) {
          await bookingService.deleteBooking(b.id, shop);
          localDeleted = true;
        }
        results.push({
          id: b.id,
          order_id: b.order_id,
          success: shopifyRes.success,
          shopify: shopifyRes,
          localDeleted,
          error: shopifyRes.success ? undefined : (shopifyRes.error || 'Shopify revert failed'),
        });
      } else {
        await bookingService.updateStatus(b.id, shop, status);
        results.push({ id: b.id, order_id: b.order_id, success: true, status });
      }
    }

    const failed = results.filter(r => !r.success).length;
    res.json({
      success: failed === 0,
      status,
      updated: results.length - failed,
      failed,
      results,
    });
  } catch (error) {
    console.error('[bookings] change-status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) throw new Error('Shop domain is required');
    await bookingService.deleteBooking(req.params.id, shop);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
