// src/server/routes/shopify.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const shopifyService = require('../services/shopifyService');

// ── GET Orders (Triggered by the Booking Workbench) ──────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const result = await shopifyService.getUnfulfilledOrders(req.query.shop);
    if (result && result.requireAuth) {
      return res.json({ success: false, requireAuth: true });
    }
    res.json({ success: true, orders: result });
  } catch (error) {
    console.error('[shopifyRoute] Error handling orders request:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET Auth (Initiates Shopify OAuth Flow) ──────────────────────────────────
router.get('/auth', (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send('Missing shop parameter.');

  const clientId = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SCOPES;
  const redirectUri = `${process.env.HOST}/api/shopify/auth/callback`;

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(authUrl);
});

// ── GET Auth Callback (Handles token exchange and saving to .env) ────────────
router.get('/auth/callback', async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).send('Missing shop or code.');

  try {
    // 1. Exchange the code for a permanent access token (Access Code)
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Save the token into the .env file permanently
    const envPath = path.resolve(__dirname, '../../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Replace if exists, otherwise append
    if (envContent.includes('SHOPIFY_ADMIN_ACCESS_TOKEN=')) {
      envContent = envContent.replace(
        /SHOPIFY_ADMIN_ACCESS_TOKEN=.*/g,
        `SHOPIFY_ADMIN_ACCESS_TOKEN=${accessToken}`
      );
    } else {
      envContent += `\nSHOPIFY_ADMIN_ACCESS_TOKEN=${accessToken}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    // 3. Update the running process environment so we don't have to restart
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = accessToken;

    // 4. Redirect the user back to the Booking tab!
    res.redirect(`/?shop=${shop}#bookings`);

  } catch (error) {
    console.error('Error during OAuth callback:', error.message);
    if (error.response) console.error(error.response.data);
    res.status(500).send('Failed to get access token from Shopify.');
  }
});

module.exports = router;
