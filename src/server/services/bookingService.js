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
  const { shop, orderId, courier, trackingNumber, consigneeName, consigneePhone, consigneeCity, codAmount, orderAmount, accountId } = data;
  try {
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
  } catch (error) {
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

module.exports = {
  getAllBookings,
  saveBooking,
  isOrderBooked,
  deleteBooking,
  findBookingByTrackingForLoadsheet,
  findBookingByTrackingForReturn
};
