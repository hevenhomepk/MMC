// src/server/routes/settings.js
const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');

// GET /api/settings?shop=...
router.get('/', async (req, res) => {
  try {
    const settings = await settingsService.getSettings(req.query.shop);
    res.json({ success: true, settings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/settings  Body: { shop, ...fields }
router.post('/', async (req, res) => {
  try {
    const { shop, ...data } = req.body;
    const settings = await settingsService.saveSettings(shop, data);
    res.json({ success: true, settings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
