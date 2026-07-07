// src/server/services/bookingService.js
const db = require('../db');

async function getAllBookings(shop) {
  try {
    const result = await db.query(
      `SELECT * FROM bookings WHERE shop_domain = $1 ORDER BY created_at DESC`,
      [shop]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
}

async function saveBooking(data) {
  const {
    shop, orderId, courier, trackingNumber, traceid,
    consigneeName, consigneePhone, consigneeCity, codAmount, orderAmount, accountId,
    consigneeAddress, consigneeEmail, productDetails, weight, pieces, remarks, serviceType,
  } = data;
  try {
    const query = `
      INSERT INTO bookings (
        shop_domain, order_id, courier, tracking_number,
        consignee_name, consignee_phone, consignee_city, cod_amount, order_amount, account_id, traceid,
        consignee_address, consignee_email, product_details, weight, pieces, remarks, service_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    const result = await db.query(query, [
      shop, orderId, courier, trackingNumber,
      consigneeName, consigneePhone, consigneeCity, codAmount, orderAmount || 0, accountId, traceid || null,
      consigneeAddress || null, consigneeEmail || null, productDetails || null,
      weight != null ? String(weight) : null, parseInt(pieces) || 1, remarks || null, serviceType || null,
    ]);
    return result.rows[0];
  } catch (error) {
    // If newer columns don't exist yet on this DB, fall back to the core columns.
    if (error.message && /column .* does not exist/i.test(error.message)) {
      console.warn('[saveBooking] Falling back to core columns only:', error.message);
      const query = `
        INSERT INTO bookings (
          shop_domain, order_id, courier, tracking_number,
          consignee_name, consignee_phone, consignee_city, cod_amount, order_amount, account_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const result = await db.query(query, [
        shop, orderId, courier, trackingNumber,
        consigneeName, consigneePhone, consigneeCity, codAmount, orderAmount || 0, accountId
      ]);
      return result.rows[0];
    }
    console.error('Error saving booking:', error);
    throw error;
  }
}

async function isOrderBooked(shop, orderId) {
  try {
    const result = await db.query(
      `SELECT id, tracking_number, courier FROM bookings WHERE shop_domain = $1 AND order_id = $2 LIMIT 1`,
      [shop, orderId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error checking if order is booked:', error);
    return null;
  }
}

async function deleteBooking(id, shop) {
  try {
    await db.query(
      `DELETE FROM bookings WHERE id = $1 AND shop_domain = $2`,
      [id, shop]
    );
    return { success: true };
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
}

async function findBookingByTrackingForLoadsheet(shop, courier, trackingOrOrder) {
  try {
    const result = await db.query(
      `SELECT * FROM bookings 
       WHERE shop_domain = $1 
         AND courier = $2 
         AND (tracking_number = $3 OR order_id = $3)
         AND loadsheet_id IS NULL
       LIMIT 1`,
      [shop, courier, trackingOrOrder]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error finding booking for scanner:', error);
    throw error;
  }
}

async function findBookingByTrackingForReturn(shop, courier, trackingOrOrder) {
  try {
    const result = await db.query(
      `SELECT * FROM bookings 
       WHERE shop_domain = $1 
         AND courier = $2 
         AND (tracking_number = $3 OR order_id = $3)
         AND return_sheet_id IS NULL
       LIMIT 1`,
      [shop, courier, trackingOrOrder]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error finding booking for return scanner:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracking helpers
// ─────────────────────────────────────────────────────────────────────────────

// Terminal statuses: once a shipment reaches these we stop tracking/pushing.
const TERMINAL = ['Delivered', 'Return to Shipper'];

/**
 * Active TCS bookings for a shop that still need tracking (non-terminal, recent).
 */
async function getActiveBookingsForTracking(shop) {
  try {
    const result = await db.query(
      `SELECT id, order_id, tracking_number, status, last_shopify_event, fulfillment_id
         FROM bookings
        WHERE shop_domain = $1
          AND courier = 'TCS'
          AND (status IS NULL OR status NOT IN ('Delivered', 'Return to Shipper'))
          AND created_at > NOW() - INTERVAL '60 days'`,
      [shop]
    );
    return result.rows;
  } catch (error) {
    console.error('Error loading active bookings for tracking:', error.message);
    return [];
  }
}

/**
 * Loads specific TCS bookings by their tracking numbers (for on-demand tracking
 * of a user-selected set — includes already-terminal ones so a manual refresh works).
 */
async function getBookingsByTrackingNumbers(shop, cns) {
  const list = (Array.isArray(cns) ? cns : [cns]).map(c => String(c || '').trim()).filter(Boolean);
  if (list.length === 0) return [];
  try {
    const result = await db.query(
      `SELECT id, order_id, tracking_number, status, last_shopify_event, fulfillment_id
         FROM bookings
        WHERE shop_domain = $1 AND courier = 'TCS' AND tracking_number = ANY($2)`,
      [shop, list]
    );
    return result.rows;
  } catch (error) {
    console.error('Error loading bookings by tracking numbers:', error.message);
    return [];
  }
}

/**
 * Distinct shop domains that have at least one active TCS booking to track.
 */
async function getShopsWithActiveBookings() {
  try {
    const result = await db.query(
      `SELECT DISTINCT shop_domain
         FROM bookings
        WHERE courier = 'TCS'
          AND (status IS NULL OR status NOT IN ('Delivered', 'Return to Shipper'))
          AND created_at > NOW() - INTERVAL '60 days'`
    );
    return result.rows.map(r => r.shop_domain);
  } catch (error) {
    console.error('Error loading shops with active bookings:', error.message);
    return [];
  }
}

/**
 * Updates a booking's tracking fields. Only provided fields are written (COALESCE).
 */
async function updateTrackingStatus(id, { status, statusCode, trackingDetail, lastTrackedAt, deliveredAt, lastShopifyEvent } = {}) {
  try {
    await db.query(
      `UPDATE bookings SET
         status             = COALESCE($2, status),
         status_code        = COALESCE($3, status_code),
         tracking_detail    = COALESCE($4, tracking_detail),
         last_tracked_at    = COALESCE($5, last_tracked_at),
         delivered_at       = COALESCE($6, delivered_at),
         last_shopify_event = COALESCE($7, last_shopify_event)
       WHERE id = $1`,
      [
        id,
        status || null,
        statusCode || null,
        trackingDetail || null,
        lastTrackedAt || null,
        deliveredAt || null,
        lastShopifyEvent || null,
      ]
    );
  } catch (error) {
    console.error(`Error updating tracking status for booking ${id}:`, error.message);
  }
}

module.exports = {
  getAllBookings,
  saveBooking,
  isOrderBooked,
  deleteBooking,
  findBookingByTrackingForLoadsheet,
  findBookingByTrackingForReturn,
  getActiveBookingsForTracking,
  getBookingsByTrackingNumbers,
  getShopsWithActiveBookings,
  updateTrackingStatus,
  TERMINAL,
};
