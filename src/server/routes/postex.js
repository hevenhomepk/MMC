// src/server/routes/postex.js
const express = require('express');
const router = express.Router();
const postexService = require('../services/postexService');

router.get('/accounts', async (req, res) => {
  try {
    const accounts = await postexService.getAccounts(req.query.shop);
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const result = await postexService.saveAccount(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const result = await postexService.deleteAccount(req.params.id, req.query.shop);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/accounts/:id/toggle', async (req, res) => {
  try {
    const result = await postexService.toggleAccountStatus(req.params.id, req.query.shop, req.body.is_enabled);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const result = await postexService.validateAndFetchPickups(req.body.api_token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/book', async (req, res) => {
  try {
    const result = await postexService.bookShipment(req.body);
    res.json(result); // result already has { success, error, trackingNumber }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
