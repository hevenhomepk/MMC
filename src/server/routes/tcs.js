// src/server/routes/tcs.js
const express = require('express');
const router = express.Router();
const tcsService = require('../services/tcsService');
const trackingService = require('../services/trackingService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a standardised error response, preserving the tcsCode when available.
 */
function sendError(res, err, httpStatus = 400) {
  const code = err.tcsCode || 'ERROR';
  const retryable = err.retryable ?? false;
  console.error(`[TCS Route] ${code}:`, err.message);
  return res.status(httpStatus).json({ success: false, error: err.message, code, retryable });
}

// ─────────────────────────────────────────────────────────────────────────────
// Account CRUD
// ─────────────────────────────────────────────────────────────────────────────

// Create or update a TCS account
router.post('/accounts', async (req, res) => {
  try {
    const result = await tcsService.saveAccount(req.body);
    res.json({ success: true, data: result });
  } catch (e) {
    sendError(res, e, 500);
  }
});

// Get all accounts for a shop
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await tcsService.getAccounts(req.query.shop);
    res.json({ success: true, accounts });
  } catch (e) {
    sendError(res, e, 500);
  }
});

// Delete an account
router.delete('/accounts/:id', async (req, res) => {
  try {
    await tcsService.deleteAccount(req.params.id, req.query.shop);
    res.json({ success: true });
  } catch (e) {
    sendError(res, e, 500);
  }
});

// Toggle account enabled/disabled
router.patch('/accounts/:id/toggle', async (req, res) => {
  try {
    await tcsService.toggleAccountStatus(req.params.id, req.query.shop, req.body.is_enabled);
    res.json({ success: true });
  } catch (e) {
    sendError(res, e, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Verify credentials → receive + persist access token
// POST /api/tcs/verify
// Body: { username, password, shop? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { username, password, shop } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required.',
      code: 'MISSING_FIELDS',
      retryable: false,
    });
  }

  try {
    const tokenInfo = await tcsService.getTcsToken(username, password, shop || null);

    // If shop is provided the token was already saved inside getTcsToken.
    // Explicitly save it if shop was not passed (verify-only call).
    if (shop && tokenInfo.token) {
      await tcsService.saveTokenToDb(username, shop, tokenInfo.token, tokenInfo.expiresAt);
    }

    return res.json({
      success: true,
      accesstoken: tokenInfo.token,
      expiry: tokenInfo.expiry,
      tokenSaved: !!shop,
      message: 'Authentication successful. Access token issued.',
    });

  } catch (e) {
    return sendError(res, e, 401);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Fetch pickup addresses using access token + account number
// POST /api/tcs/pickups
// Body: { username?, password?, accountNumber, accessToken, shop }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/pickups', async (req, res) => {
  const { username, password, accountNumber, accessToken, shop } = req.body;

  if (!shop) {
    return res.status(400).json({
      success: false,
      error: 'Shop identifier is required.',
      code: 'MISSING_FIELDS',
      retryable: false,
    });
  }

  if (!accountNumber) {
    return res.status(400).json({
      success: false,
      error: 'Account number is required to load pickup addresses.',
      code: 'ACCOUNT_NOT_FOUND',
      retryable: false,
    });
  }

  if (!accessToken && !(username && password)) {
    return res.status(400).json({
      success: false,
      error: 'Either an access token or credentials (username + password) must be provided.',
      code: 'MISSING_FIELDS',
      retryable: false,
    });
  }

  try {
    const data = await tcsService.fetchAndStorePickups({
      username,
      password,
      accountNumber,
      accessToken,
      shop,
    });

    return res.json({
      success: true,
      detail: data.detail,
      costCenters: data.costCenters,   // ← deduplicated dropdown options { value, label, city }
      message: data.message,
      traceid: data.traceid,
    });

  } catch (e) {
    // Map TOKEN_EXPIRED to 401 so the client can react specifically
    const httpStatus = e.tcsCode === 'TOKEN_EXPIRED' ? 401 : 400;
    return sendError(res, e, httpStatus);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Combined validate + store (used when saving a new account in one shot)
// POST /api/tcs/validate
// Body: { username, password, accountNumber, shop, is_default? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/validate', async (req, res) => {
  const { username, password, accountNumber, shop, is_default } = req.body;

  if (!shop) {
    return res.status(400).json({
      success: false,
      error: 'Shop identifier is required.',
      code: 'MISSING_FIELDS',
      retryable: false,
    });
  }

  try {
    const saved = await tcsService.validateAndStoreAccount({ username, password, accountNumber, shop, is_default });
    const data = await tcsService.validateAndFetchPickups({ username, password, accountNumber, shop });

    return res.json({
      success: true,
      savedAccount: saved,
      pickups: data.pickups,
      costCenters: data.costCenters,
    });

  } catch (e) {
    return sendError(res, e, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Book shipment (single or bulk)
// POST /api/tcs/book
// ─────────────────────────────────────────────────────────────────────────────
router.post('/book', async (req, res) => {
  try {
    const result = await tcsService.bookShipment(req.body);
    res.json(result);
  } catch (e) {
    sendError(res, e, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Print consignment label(s) as a PDF (TCS native CNPrint API)
// GET /api/tcs/print-label?shop=...&cn=CN1,CN2&printtype=3&shipperDetails=false&accounttype=1
// Served as a GET so the client can open it directly in a new tab / print dialog.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/print-label', async (req, res) => {
  const { shop, cn, printtype, shipperDetails, accounttype } = req.query;

  if (!shop || !cn) {
    return res.status(400).json({
      success: false,
      error: 'shop and cn (consignment number) are required.',
      code: 'MISSING_FIELDS',
      retryable: false,
    });
  }

  try {
    const consignmentNos = String(cn).split(',').map(s => s.trim()).filter(Boolean);
    const { buffer, contentType } = await tcsService.printLabel({
      shop,
      consignmentNos,
      printType: printtype,
      shipperDetails: shipperDetails === 'true' || shipperDetails === '1',
      accountType: accounttype,
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="tcs-labels-${Date.now()}.pdf"`);
    return res.send(buffer);
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tracking — admin/test trigger to run a tracking cycle for a shop on demand.
// The primary refresh path is the background poller (trackingService.startPoller);
// this endpoint exists so a cycle can be forced without waiting for the interval.
// POST /api/tcs/track  { shop }
// Optional: GET /api/tcs/track/:cn  → raw tracking for one/comma-separated CN(s)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/track', async (req, res) => {
  const { shop, cns } = req.body;
  if (!shop) {
    return res.status(400).json({ success: false, error: 'shop is required.', code: 'MISSING_FIELDS' });
  }
  try {
    // `cns` (optional): track only these consignment numbers (Track button on selected
    // rows). Without it, tracks every active booking for the shop (same as the poller).
    const list = Array.isArray(cns)
      ? cns.map(c => String(c || '').trim()).filter(Boolean)
      : (cns ? String(cns).split(',').map(s => s.trim()).filter(Boolean) : null);
    const summary = await trackingService.pollShopTracking(shop, list && list.length ? { cns: list } : {});
    res.json({ success: true, ...summary });
  } catch (e) {
    sendError(res, e, 500);
  }
});

router.get('/track/:cn', async (req, res) => {
  try {
    const cns = String(req.params.cn).split(',').map(s => s.trim()).filter(Boolean);
    const map = await tcsService.trackConsignments(cns);
    const out = {};
    for (const cn of cns) {
      const perCn = map.get(cn);
      out[cn] = { derived: tcsService.deriveStatus(perCn), detail: perCn };
    }
    res.json({ success: true, results: out });
  } catch (e) {
    sendError(res, e, 500);
  }
});

module.exports = router;
