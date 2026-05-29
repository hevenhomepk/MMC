// src/server/routes/tcs.js
const express = require('express');
const router = express.Router();
const tcsService = require('../services/tcsService');

// Create or update a TCS account (store encrypted credentials in Shopify metafields or DB)
router.post('/accounts', async (req, res) => {
  try {
    const result = await tcsService.saveAccount(req.body);
    res.json({ success: true, data: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get all accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await tcsService.getAccounts(req.query.shop);
    res.json({ success: true, accounts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Delete an account
router.delete('/accounts/:id', async (req, res) => {
  try {
    await tcsService.deleteAccount(req.params.id, req.query.shop);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Toggle account status
router.patch('/accounts/:id/toggle', async (req, res) => {
  try {
    await tcsService.toggleAccountStatus(req.params.id, req.query.shop, req.body.is_enabled);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Validate credentials and fetch pickup locations
router.post('/validate', async (req, res) => {
  try {
    const { username, password, accountNumber } = req.body;
    const data = await tcsService.validateAndFetchPickups({ username, password, accountNumber });
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, error: e.message });
  }
});

// Book shipment (single or bulk)
router.post('/book', async (req, res) => {
  try {
    const result = await tcsService.bookShipment(req.body);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
