const express = require('express');
const router = express.Router();
const db = require('../db');
const bookingService = require('../services/bookingService');

// 1. Scan a tracking number/order ID for return
router.get('/scan', async (req, res) => {
  try {
    const { shop, courier, tracking } = req.query;
    if (!shop || !courier || !tracking) {
      return res.status(400).json({ success: false, error: 'Missing shop, courier, or tracking parameter' });
    }
    const booking = await bookingService.findBookingByTrackingForReturn(shop, courier, tracking);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found, invalid courier, or already returned' });
    }
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Create a new Return Sheet
router.post('/', async (req, res) => {
  const { shop, courier, bookingIds } = req.body;
  if (!shop || !courier || !bookingIds || bookingIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const returnNumber = `RT-${Date.now()}`;
    
    // Create return sheet record
    const rsResult = await db.query(
      'INSERT INTO return_sheets (shop_domain, courier, return_sheet_number, total_shipments, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [shop, courier, returnNumber, bookingIds.length, 'Created']
    );
    const returnSheetId = rsResult.rows[0].id;

    // Update bookings with return_sheet_id, status, and return_status
    await db.query(
      "UPDATE bookings SET return_sheet_id = $1, status = 'Return Pending', return_status = 'Return Pending' WHERE id = ANY($2)",
      [returnSheetId, bookingIds]
    );

    // Calculate totals
    const sumResult = await db.query(
      'SELECT SUM(order_amount) as sum_amount, SUM(cod_amount) as sum_cod FROM bookings WHERE return_sheet_id = $1',
      [returnSheetId]
    );
    const sumAmount = sumResult.rows[0].sum_amount || 0;
    const sumCod = sumResult.rows[0].sum_cod || 0;

    await db.query(
      'UPDATE return_sheets SET total_amount = $1, total_cod = $2 WHERE id = $3',
      [sumAmount, sumCod, returnSheetId]
    );

    res.json({ success: true, returnSheetId, returnNumber, totalAmount: sumAmount, totalCod: sumCod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3. Fetch all Return Sheets
router.get('/sheets', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ success: false, message: 'Missing shop parameter' });

  try {
    const result = await db.query(
      'SELECT * FROM return_sheets WHERE shop_domain = $1 ORDER BY created_at DESC',
      [shop]
    );
    res.json({ success: true, returnSheets: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 4. Fetch specific Return Sheet details
router.get('/sheets/:id', async (req, res) => {
  const { shop } = req.query;
  const { id } = req.params;
  
  if (!shop || !id) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  try {
    const rsResult = await db.query(
      'SELECT * FROM return_sheets WHERE id = $1 AND shop_domain = $2',
      [id, shop]
    );

    if (rsResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Return sheet not found' });
    }

    const returnSheet = rsResult.rows[0];
    const bookingsResult = await db.query(
      'SELECT * FROM bookings WHERE return_sheet_id = $1 AND shop_domain = $2',
      [id, shop]
    );

    res.json({ success: true, returnSheet, bookings: bookingsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 5. Print Return Sheet
router.get('/sheets/:id/print', async (req, res) => {
  const { shop } = req.query;
  const { id } = req.params;

  if (!shop || !id) {
    return res.status(400).send('Missing parameters');
  }

  try {
    const rsResult = await db.query('SELECT * FROM return_sheets WHERE id = $1 AND shop_domain = $2', [id, shop]);
    if (rsResult.rows.length === 0) return res.status(404).send('Return sheet not found');
    const returnSheet = rsResult.rows[0];

    const bookingsResult = await db.query('SELECT * FROM bookings WHERE return_sheet_id = $1 AND shop_domain = $2', [id, shop]);
    const bookings = bookingsResult.rows;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Return Sheet ${returnSheet.return_sheet_number}</title>
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
          <h2>Return Sheet: ${returnSheet.return_sheet_number}</h2>
        </div>
        <div class="info">
          <div>
            <strong>Courier:</strong> ${returnSheet.courier}<br>
            <strong>Date:</strong> ${new Date(returnSheet.created_at).toLocaleString()}<br>
            <strong>Status:</strong> ${returnSheet.status}
          </div>
          <div style="text-align: right;">
            <strong>Total Shipments:</strong> ${returnSheet.total_shipments}<br>
            <strong>Total Order Amount:</strong> Rs. ${returnSheet.total_amount || 0}<br>
            <strong>Total COD:</strong> Rs. ${returnSheet.total_cod || 0}
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

// 6. Fetch return bookings by return_status (Return Pending or Return Received)
router.get('/bookings', async (req, res) => {
  const { shop, return_status } = req.query;
  if (!shop || !return_status) {
    return res.status(400).json({ success: false, message: 'Missing shop or return_status parameter' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM bookings WHERE shop_domain = $1 AND return_status = $2 ORDER BY created_at DESC',
      [shop, return_status]
    );
    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 7. Bulk receive return bookings
router.post('/bookings/receive', async (req, res) => {
  const { shop, bookingIds } = req.body;
  if (!shop || !bookingIds || bookingIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    await db.query(
      "UPDATE bookings SET return_status = 'Return Received', status = 'Return Received by Shipper' WHERE id = ANY($1) AND shop_domain = $2",
      [bookingIds, shop]
    );
    res.json({ success: true, message: 'Successfully marked return(s) as received' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
