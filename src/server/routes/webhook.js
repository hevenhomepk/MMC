// src/server/routes/webhook.js
const express = require('express');
const router = express.Router();
// Placeholder: webhook verification middleware
function verifyShopifyWebhook(req, res, next) {
  // TODO: verify HMAC header with app secret
  next();
}

router.post('/orders/create', verifyShopifyWebhook, async (req, res) => {
  try {
    const order = req.body;
    // Process order: store in DB or trigger booking logic
    console.log('Order created webhook received', order.id);
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

module.exports = router;
