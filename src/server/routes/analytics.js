// src/server/routes/analytics.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: parse date or default
function safeDate(val, fallback) {
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return fallback;
}

// GET /api/analytics/performance
// Returns: courier performance, city performance (top 50), items performance (top 100)
router.get('/performance', async (req, res) => {
  try {
    const { shop, dateFrom, dateTo, courier, city, status } = req.query;
    if (!shop) return res.status(400).json({ success: false, error: 'shop is required' });

    const today = new Date().toISOString().slice(0, 10);
    const from = safeDate(dateFrom, today);
    const to = safeDate(dateTo, today);

    // Courier Performance
    const courierPerfQuery = `
      SELECT
        courier,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Booked'     THEN 1 ELSE 0 END) AS booked,
        SUM(CASE WHEN status = 'Loadsheet'  THEN 1 ELSE 0 END) AS loadsheet,
        SUM(CASE WHEN status = 'Shipped'    THEN 1 ELSE 0 END) AS shipped,
        SUM(CASE WHEN status = 'Assigned'   THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN status = 'Pending'    THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Refused'    THEN 1 ELSE 0 END) AS refused,
        SUM(CASE WHEN status = 'Delivered'  THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'Returned'   THEN 1 ELSE 0 END) AS returned,
        SUM(CASE WHEN status = 'RTS'        THEN 1 ELSE 0 END) AS rts,
        SUM(CASE WHEN status = 'Cancelled'  THEN 1 ELSE 0 END) AS cancelled
      FROM bookings
      WHERE shop_domain = $1
        AND DATE(created_at) >= $2
        AND DATE(created_at) <= $3
        ${courier ? "AND courier = $4" : ""}
        ${city ? `AND consignee_city = $${courier ? 5 : 4}` : ""}
        ${status ? `AND status = $${[courier, city].filter(Boolean).length + 4}` : ""}
      GROUP BY courier
      ORDER BY total DESC
    `;

    // Build params dynamically
    const buildParams = (shop, from, to, courier, city, status) => {
      const params = [shop, from, to];
      if (courier) params.push(courier);
      if (city) params.push(city);
      if (status) params.push(status);
      return params;
    };

    const params = buildParams(shop, from, to, courier, city, status);
    const courierResult = await db.query(courierPerfQuery, params);

    // City Performance (Top 50)
    const cityPerfQuery = `
      SELECT
        consignee_city AS city,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'Returned'  THEN 1 ELSE 0 END) AS returned,
        SUM(CASE WHEN status = 'RTS'       THEN 1 ELSE 0 END) AS rts,
        SUM(CASE WHEN status NOT IN ('Delivered','Returned','RTS') THEN 1 ELSE 0 END) AS other,
        (SELECT b2.courier FROM bookings b2
          WHERE b2.shop_domain = b.shop_domain
            AND b2.consignee_city = b.consignee_city
            AND b2.status = 'Delivered'
            AND DATE(b2.created_at) >= $2
            AND DATE(b2.created_at) <= $3
          GROUP BY b2.courier ORDER BY COUNT(*) DESC LIMIT 1
        ) AS best_courier
      FROM bookings b
      WHERE shop_domain = $1
        AND DATE(created_at) >= $2
        AND DATE(created_at) <= $3
        ${courier ? "AND courier = $4" : ""}
      GROUP BY consignee_city, shop_domain
      ORDER BY total DESC
      LIMIT 50
    `;

    const cityParams = [shop, from, to];
    if (courier) cityParams.push(courier);
    const cityResult = await db.query(cityPerfQuery, cityParams);

    // Items Performance (Top 100) — group by order_id as proxy for product
    const itemsPerfQuery = `
      SELECT
        order_id AS product,
        COUNT(*) AS qty,
        SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'Returned'  THEN 1 ELSE 0 END) AS returned,
        SUM(CASE WHEN status = 'RTS'       THEN 1 ELSE 0 END) AS rts,
        SUM(CASE WHEN status NOT IN ('Delivered','Returned','RTS') THEN 1 ELSE 0 END) AS other,
        SUM(cod_amount) AS amount
      FROM bookings
      WHERE shop_domain = $1
        AND DATE(created_at) >= $2
        AND DATE(created_at) <= $3
        ${courier ? "AND courier = $4" : ""}
      GROUP BY order_id
      ORDER BY qty DESC
      LIMIT 100
    `;

    const itemsParams = [shop, from, to];
    if (courier) itemsParams.push(courier);
    const itemsResult = await db.query(itemsPerfQuery, itemsParams);

    res.json({
      success: true,
      courierPerformance: courierResult.rows,
      cityPerformance: cityResult.rows,
      itemsPerformance: itemsResult.rows,
    });
  } catch (err) {
    console.error('Analytics performance error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/report
// Returns per-courier status breakdown
router.get('/report', async (req, res) => {
  try {
    const { shop, dateFrom, dateTo, courier, city } = req.query;
    if (!shop) return res.status(400).json({ success: false, error: 'shop is required' });

    const today = new Date().toISOString().slice(0, 10);
    const from = safeDate(dateFrom, today);
    const to = safeDate(dateTo, today);

    const params = [shop, from, to];
    let paramIdx = 4;

    let courierClause = '';
    if (courier) { courierClause = `AND courier = $${paramIdx++}`; params.push(courier); }

    let cityClause = '';
    if (city) { cityClause = `AND consignee_city = $${paramIdx++}`; params.push(city); }

    const query = `
      SELECT
        courier,
        status,
        COUNT(*) AS parcel,
        COALESCE(SUM(cod_amount), 0) AS amount
      FROM bookings
      WHERE shop_domain = $1
        AND DATE(created_at) >= $2
        AND DATE(created_at) <= $3
        ${courierClause}
        ${cityClause}
      GROUP BY courier, status
      ORDER BY courier, status
    `;

    const result = await db.query(query, params);

    // Group by courier
    const couriers = {};
    const STATUSES = ['Total','Booked','Loadsheet','Shipped','Assigned','Pending','Refused','Delivered','Returned','RTS','Cancelled'];
    for (const row of result.rows) {
      if (!couriers[row.courier]) {
        couriers[row.courier] = {};
        STATUSES.forEach(s => { couriers[row.courier][s] = { parcel: 0, amount: 0 }; });
      }
      const st = row.status.charAt(0).toUpperCase() + row.status.slice(1);
      if (couriers[row.courier][st]) {
        couriers[row.courier][st].parcel += parseInt(row.parcel);
        couriers[row.courier][st].amount += parseFloat(row.amount);
      }
      couriers[row.courier]['Total'].parcel += parseInt(row.parcel);
      couriers[row.courier]['Total'].amount += parseFloat(row.amount);
    }

    res.json({ success: true, couriers });
  } catch (err) {
    console.error('Analytics report error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/calendar
// Returns per-day status breakdown
router.get('/calendar', async (req, res) => {
  try {
    const { shop, dateFrom, dateTo, courier, city } = req.query;
    if (!shop) return res.status(400).json({ success: false, error: 'shop is required' });

    const today = new Date().toISOString().slice(0, 10);
    const from = safeDate(dateFrom, today);
    const to = safeDate(dateTo, today);

    const params = [shop, from, to];
    let paramIdx = 4;

    let courierClause = '';
    if (courier) { courierClause = `AND courier = $${paramIdx++}`; params.push(courier); }

    let cityClause = '';
    if (city) { cityClause = `AND consignee_city = $${paramIdx++}`; params.push(city); }

    const query = `
      SELECT
        TO_CHAR(DATE(created_at), 'DD/MM/YYYY') AS date,
        status,
        COUNT(*) AS count
      FROM bookings
      WHERE shop_domain = $1
        AND DATE(created_at) >= $2
        AND DATE(created_at) <= $3
        ${courierClause}
        ${cityClause}
      GROUP BY DATE(created_at), status
      ORDER BY DATE(created_at) ASC, status
    `;

    const result = await db.query(query, params);

    // Build a map of date -> status counts
    const dayMap = {};
    for (const row of result.rows) {
      if (!dayMap[row.date]) dayMap[row.date] = {};
      dayMap[row.date][row.status] = parseInt(row.count);
    }

    // Generate all days in range
    const days = [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const key = `${dd}/${mm}/${yyyy}`;
      days.push({ date: key, ...(dayMap[key] || {}) });
    }

    res.json({ success: true, days });
  } catch (err) {
    console.error('Analytics calendar error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
