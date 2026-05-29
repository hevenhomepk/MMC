const express = require('express');
const router = express.Router();
const db = require('../db');
const tcsService = require('../services/tcsService');
const postexService = require('../services/postexService');

// Fetch from Courier API
router.get('/fetch-remote', async (req, res) => {
  const { shop, courier, from, to } = req.query;
  
  if (!shop || !courier || !from) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  try {
    let data;
    if (courier.toLowerCase() === 'tcs') {
      data = await tcsService.fetchLoadsheets(shop, from, to);
    } else if (courier.toLowerCase() === 'postex') {
      data = await postexService.fetchLoadsheets(shop, from, to);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid courier' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// Create a new loadsheet
router.post('/', async (req, res) => {
  const { shop, courier, bookingIds } = req.body;
  if (!shop || !courier || !bookingIds || bookingIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // 1. Create loadsheet record
    const loadsheetNumber = `LS-${Date.now()}`;
    const lsResult = await db.query(
      'INSERT INTO loadsheets (shop_domain, courier, loadsheet_number, total_shipments, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [shop, courier, loadsheetNumber, bookingIds.length, 'Created']
    );
    const loadsheetId = lsResult.rows[0].id;

    // 2. Update bookings with loadsheet_id and status
    await db.query(
      'UPDATE bookings SET loadsheet_id = $1, status = $2 WHERE id = ANY($3)',
      [loadsheetId, 'Loadsheet', bookingIds]
    );

    // 3. Calculate totals
    const sumResult = await db.query(
      'SELECT SUM(order_amount) as sum_amount, SUM(cod_amount) as sum_cod FROM bookings WHERE loadsheet_id = $1',
      [loadsheetId]
    );
    const sumAmount = sumResult.rows[0].sum_amount || 0;
    const sumCod = sumResult.rows[0].sum_cod || 0;

    await db.query(
      'UPDATE loadsheets SET total_amount = $1, total_cod = $2 WHERE id = $3',
      [sumAmount, sumCod, loadsheetId]
    );

    res.json({ success: true, loadsheetId, loadsheetNumber, totalAmount: sumAmount, totalCod: sumCod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get loadsheets
router.get('/', async (req, res) => {
  const { shop, from, to } = req.query;
  try {
    let query = 'SELECT * FROM loadsheets WHERE shop_domain = $1';
    let params = [shop];

    if (from && to) {
      query += ' AND created_at >= $2 AND created_at <= $3';
      params.push(from + ' 00:00:00', to + ' 23:59:59');
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    res.json({ success: true, loadsheets: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a single loadsheet and its bookings
router.get('/:id', async (req, res) => {
  const { shop } = req.query;
  const { id } = req.params;
  
  if (!shop || !id) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  try {
    // Get Loadsheet details
    const lsResult = await db.query(
      'SELECT * FROM loadsheets WHERE id = $1 AND shop_domain = $2',
      [id, shop]
    );

    if (lsResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loadsheet not found' });
    }

    const loadsheet = lsResult.rows[0];

    // Get associated bookings
    const bookingsResult = await db.query(
      'SELECT * FROM bookings WHERE loadsheet_id = $1 AND shop_domain = $2',
      [id, shop]
    );

    res.json({ success: true, loadsheet, bookings: bookingsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Print a loadsheet
router.get('/:id/print', async (req, res) => {
  const { shop } = req.query;
  const { id } = req.params;
  
  if (!shop || !id) {
    return res.status(400).send('Missing parameters');
  }

  try {
    const lsResult = await db.query('SELECT * FROM loadsheets WHERE id = $1 AND shop_domain = $2', [id, shop]);
    if (lsResult.rows.length === 0) return res.status(404).send('Loadsheet not found');
    const loadsheet = lsResult.rows[0];

    const bookingsResult = await db.query('SELECT * FROM bookings WHERE loadsheet_id = $1 AND shop_domain = $2', [id, shop]);
    const bookings = bookingsResult.rows;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Loadsheet ${loadsheet.loadsheet_number}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #000; }
          .header { text-align: center; margin-bottom: 20px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f4f4f4; }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Loadsheet: ${loadsheet.loadsheet_number}</h2>
        </div>
        <div class="info">
          <div>
            <strong>Courier:</strong> ${loadsheet.courier}<br>
            <strong>Date:</strong> ${new Date(loadsheet.created_at).toLocaleString()}<br>
            <strong>Status:</strong> ${loadsheet.status}
          </div>
          <div style="text-align: right;">
            <strong>Total Shipments:</strong> ${loadsheet.total_shipments}<br>
            <strong>Total Order Amount:</strong> Rs. ${loadsheet.total_amount || 0}<br>
            <strong>Total COD:</strong> Rs. ${loadsheet.total_cod || 0}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Order ID</th>
              <th>Tracking #</th>
              <th>Consignee</th>
              <th>Phone</th>
              <th>City</th>
              <th>Order Amount</th>
              <th>COD Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map((b, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${b.order_id}</td>
                <td>${b.tracking_number}</td>
                <td>${b.consignee_name}</td>
                <td>${b.consignee_phone || '-'}</td>
                <td>${b.consignee_city}</td>
                <td>Rs. ${b.order_amount || 0}</td>
                <td>Rs. ${b.cod_amount || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = () => { window.print(); }
        </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
