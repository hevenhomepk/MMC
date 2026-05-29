// src/server/routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');

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
