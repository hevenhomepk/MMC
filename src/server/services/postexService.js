// src/server/services/postexService.js
const axios = require('axios');
const db = require('../db');
const bookingService = require('./bookingService');

const POSTEX_BASE_URL = 'https://api.postex.pk';

async function validateAndFetchPickups(token) {
  try {
    const response = await axios.get(`${POSTEX_BASE_URL}/services/integration/api/order/v1/get-merchant-address`, {
      headers: { token: token }
    });
    
    // PostEx response format for dist is a list of addresses
    if (response.data && response.data.statusCode === "200") {
      return { 
        success: true, 
        pickups: response.data.dist.map(d => ({
          id: d.addressCode,
          name: `${d.address} (${d.cityName})`,
          city: d.cityName
        }))
      };
    } else {
      return { success: false, error: response.data?.statusMessage || 'Invalid API Token' };
    }
  } catch (error) {
    console.error('PostEx Validation Error:', error.response?.data || error.message);
    return { success: false, error: 'Failed to connect to PostEx API' };
  }
}

async function saveAccount(data) {
  const {
    id, shop, api_token, is_enabled, is_default,
    pickup_address_code, return_address_code, default_weight,
    shipper_remarks, order_type, shipper_handling, label_print_option,
    auto_fulfillment, auto_save_tracking, mark_paid_zero,
    auto_calc_weight, auto_calc_pieces, add_order_notes
  } = data;

  try {
    if (is_default) {
      await db.query(`UPDATE postex_accounts SET is_default = false WHERE shop_domain = $1`, [shop]);
    }

    const values = [
      shop, api_token, is_enabled || false, is_default || false,
      pickup_address_code, return_address_code, parseFloat(default_weight) || 0.5,
      shipper_remarks || '', order_type || 'Normal', shipper_handling || 'Normal',
      label_print_option || 'Print Product Name only',
      auto_fulfillment ?? true, auto_save_tracking ?? false, mark_paid_zero ?? true,
      auto_calc_weight ?? false, auto_calc_pieces ?? false, add_order_notes ?? false
    ];

    if (id) {
      const updateQuery = `
        UPDATE postex_accounts SET
          api_token = $2, is_enabled = $3, is_default = $4,
          pickup_address_code = $5, return_address_code = $6, default_weight = $7,
          shipper_remarks = $8, order_type = $9, shipper_handling = $10,
          label_print_option = $11, auto_fulfillment = $12, auto_save_tracking = $13,
          mark_paid_zero = $14, auto_calc_weight = $15, auto_calc_pieces = $16,
          add_order_notes = $17, updated_at = CURRENT_TIMESTAMP
        WHERE id = $18 AND shop_domain = $1
        RETURNING id
      `;
      const result = await db.query(updateQuery, [...values, id]);
      return { success: true, id: result.rows[0].id };
    } else {
      const insertQuery = `
        INSERT INTO postex_accounts (
          shop_domain, api_token, is_enabled, is_default,
          pickup_address_code, return_address_code, default_weight,
          shipper_remarks, order_type, shipper_handling,
          label_print_option, auto_fulfillment, auto_save_tracking,
          mark_paid_zero, auto_calc_weight, auto_calc_pieces, add_order_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
      `;
      const result = await db.query(insertQuery, values);
      return { success: true, id: result.rows[0].id };
    }
  } catch (error) {
    console.error('Error saving PostEx account:', error);
    throw new Error('Database error saving PostEx account');
  }
}

async function getAccounts(shop) {
  try {
    const result = await db.query(
      `SELECT * FROM postex_accounts WHERE shop_domain = $1 ORDER BY is_default DESC, created_at DESC`,
      [shop]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching PostEx accounts:', error);
    throw error;
  }
}

async function deleteAccount(id, shop) {
  try {
    await db.query(`DELETE FROM postex_accounts WHERE id = $1 AND shop_domain = $2`, [id, shop]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting PostEx account:', error);
    throw error;
  }
}

async function toggleAccountStatus(id, shop, isEnabled) {
  try {
    await db.query(
      `UPDATE postex_accounts SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND shop_domain = $3`,
      [isEnabled, id, shop]
    );
    return { success: true };
  } catch (error) {
    console.error('Error toggling PostEx status:', error);
    throw error;
  }
}

async function bookShipment(payload) {
  const { shop, accountId, bookingDetails } = payload;

  try {
    // Fetch account details
    const accResult = await db.query(`SELECT * FROM postex_accounts WHERE id = $1 AND shop_domain = $2`, [accountId, shop]);
    if (accResult.rows.length === 0) throw new Error('Account not found');
    const acc = accResult.rows[0];
    const orderId = bookingDetails.orderId;

    // CHECK: Is this order already booked?
    const existingBooking = await bookingService.isOrderBooked(shop, orderId);
    if (existingBooking) {
      return { 
        success: false, 
        error: `Order #${orderId} is already booked with ${existingBooking.courier} (CN: ${existingBooking.tracking_number}).` 
      };
    }

    const postExPayload = {
      orderRefNumber: bookingDetails.orderId,
      invoicePayment: bookingDetails.codAmount.toString(),
      orderDetail: bookingDetails.productDesc,
      customerName: bookingDetails.consigneeName,
      customerPhone: bookingDetails.consigneePhone,
      deliveryAddress: bookingDetails.consigneeAddress,
      transactionNotes: acc.shipper_remarks,
      cityName: bookingDetails.consigneeCity,
      invoiceDivision: 1,
      items: parseInt(bookingDetails.pieces) || 1,
      pickupAddressCode: acc.pickup_address_code,
      orderType: acc.order_type
    };

    // Use token from account
    const response = await axios.post(`${POSTEX_BASE_URL}/services/integration/api/order/v3/create-order`, postExPayload, {
      headers: { 
        'Content-Type': 'application/json',
        token: acc.api_token 
      }
    });

    if (response.data && response.data.statusCode === "200") {
      const dist = response.data.dist;
      const trackingNumber = Array.isArray(dist) ? dist[0]?.trackingNumber : dist?.trackingNumber;

      if (!trackingNumber) {
        return { success: false, error: 'PostEx API returned success but trackingNumber was missing.' };
      }

      // Save to database
      await bookingService.saveBooking({
        shop,
        orderId: bookingDetails.orderId,
        courier: 'PostEx',
        trackingNumber: trackingNumber,
        consigneeName: bookingDetails.consigneeName,
        consigneePhone: bookingDetails.consigneePhone,
        consigneeCity: bookingDetails.consigneeCity,
        codAmount: parseFloat(bookingDetails.codAmount),
        orderAmount: parseFloat(bookingDetails.orderAmount || bookingDetails.codAmount),
        accountId: accountId
      });

      return { 
        success: true, 
        trackingNumber: trackingNumber 
      };
    } else {
      return { success: false, error: response.data?.statusMessage || 'Order creation failed' };
    }
  } catch (error) {
    console.error('PostEx Booking Error:', error.response?.data || error.message);
    return { success: false, error: 'Failed to create booking on PostEx' };
  }
}

async function fetchLoadsheets(shop, fromDate, toDate) {
  const accounts = await getAccounts(shop);
  const activeAccount = accounts.find(a => a.is_default && a.is_enabled) || accounts[0];
  
  if (!activeAccount) {
    throw new Error('No active PostEx account found.');
  }

  const token = activeAccount.api_token;

  try {
    const response = await axios.get('https://api.postex.pk/services/integration/api/order/v3/get-load-sheet', {
      headers: {
        'token': token
      },
      params: {
        loadSheetDate: fromDate 
      }
    });

    return response.data;
  } catch (error) {
    console.error('PostEx Fetch Loadsheets Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch loadsheets from PostEx API.');
  }
}

module.exports = {
  validateAndFetchPickups,
  saveAccount,
  getAccounts,
  deleteAccount,
  toggleAccountStatus,
  bookShipment,
  fetchLoadsheets
};
