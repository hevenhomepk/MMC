// src/server/routes/shopify.js
const express = require('express');
const router = express.Router();
const shopifyService = require('../services/shopifyService');

router.get('/orders', async (req, res) => {
  try {
    const orders = await shopifyService.getUnfulfilledOrders(req.query.shop);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
