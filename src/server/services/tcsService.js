// src/server/services/tcsService.js
const axios = require('axios');
const crypto = require('crypto');
const db = require('../db');
const bookingService = require('./bookingService');

// Securely encrypt the password before saving to DB
function encrypt(text) {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default_key_32bytes_long!', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = textParts.join(':');
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default_key_32bytes_long!', 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const TCS_BASE_URL = 'https://ociconnect.tcscourier.com/ecom/api';

async function validateAndFetchPickups({ username, password, accountNumber }) {
  try {
    if (!username || !password || !accountNumber) {
        throw new Error("Missing credentials");
    }

    // Try to get a token to validate credentials
    const response = await axios.post(`${TCS_BASE_URL}/authentication/token`, {
      username: username,
      password: password
    });

    return {
      accessToken: response.data?.accesstoken || response.data?.token || 'validated_mock_token_if_empty'
    };
  } catch (err) {
    console.error('Validation error:', err.response ? err.response.data : err.message);
    throw new Error('Failed to validate credentials with TCS API.');
  }
}

async function saveAccount(data) {
  const { 
    id, shop, username, password, accountNumber, is_enabled, is_default, 
    pickup_address, default_weight, has_insurance, default_insurance, 
    shipper_remarks, service_type, is_fragile, label_print_option, 
    auto_fulfillment, auto_save_tracking, mark_paid_zero, auto_calc_weight, 
    auto_calc_pieces, add_order_notes, accessToken
  } = data;

  const encryptedPassword = password ? encrypt(password) : null;

  try {
    // If setting as default, remove default from other accounts for this shop
    if (is_default) {
      await db.query(`UPDATE tcs_accounts SET is_default = false WHERE shop_domain = $1`, [shop]);
    }

    const values = [
      shop, username, encryptedPassword, accountNumber, is_enabled || false, is_default || false,
      pickup_address, default_weight || 0.5, has_insurance || false, default_insurance || null,
      shipper_remarks || '', service_type || 'Express', is_fragile || false, label_print_option || 'Print Product Name Only',
      auto_fulfillment !== undefined ? auto_fulfillment : true,
      auto_save_tracking !== undefined ? auto_save_tracking : false,
      mark_paid_zero !== undefined ? mark_paid_zero : true,
      auto_calc_weight !== undefined ? auto_calc_weight : false,
      auto_calc_pieces !== undefined ? auto_calc_pieces : false,
      add_order_notes !== undefined ? add_order_notes : false,
      accessToken || null
    ];

    let result;
    if (id) {
      const updateQuery = `
        UPDATE tcs_accounts SET
          username = $2, password = COALESCE($3, password), account_number = $4, is_enabled = $5, is_default = $6,
          pickup_address = $7, default_weight = $8, has_insurance = $9, default_insurance = $10,
          shipper_remarks = $11, service_type = $12, is_fragile = $13, label_print_option = $14,
          auto_fulfillment = $15, auto_save_tracking = $16, mark_paid_zero = $17, auto_calc_weight = $18,
          auto_calc_pieces = $19, add_order_notes = $20, access_token = $21, updated_at = CURRENT_TIMESTAMP
        WHERE id = $22 AND shop_domain = $1
        RETURNING id
      `;
      const updateValues = [...values, id];
      result = await db.query(updateQuery, updateValues);
    } else {
      const insertQuery = `
        INSERT INTO tcs_accounts (
          shop_domain, username, password, account_number, is_enabled, is_default,
          pickup_address, default_weight, has_insurance, default_insurance,
          shipper_remarks, service_type, is_fragile, label_print_option,
          auto_fulfillment, auto_save_tracking, mark_paid_zero, auto_calc_weight,
          auto_calc_pieces, add_order_notes, access_token
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING id
      `;
      result = await db.query(insertQuery, values);
    }
    
    return { id: result.rows[0].id, success: true };
  } catch (error) {
    console.error('Error saving TCS account:', error);
    throw new Error('Database error saving account.');
  }
}

async function getAccounts(shop) {
  try {
    const res = await db.query('SELECT * FROM tcs_accounts WHERE shop_domain = $1 ORDER BY created_at DESC', [shop]);
    // Optionally decrypt password here if needed for UI (not recommended)
    return res.rows;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

async function bookShipment(payload) {
  const { shop, accountId, bookingDetails } = payload;
  
  // Validate that the account exists and belongs to the shop
  const res = await db.query('SELECT * FROM tcs_accounts WHERE id = $1 AND shop_domain = $2', [accountId, shop]);
  if (res.rows.length === 0) {
    throw new Error('Invalid courier account specified.');
  }

  const account = res.rows[0];
  const orderId = bookingDetails.orderId;

  // CHECK: Is this order already booked?
  const existingBooking = await bookingService.isOrderBooked(shop, orderId);
  if (existingBooking) {
    throw new Error(`Order #${orderId} is already booked with ${existingBooking.courier} (CN: ${existingBooking.tracking_number}).`);
  }

  try {
    // 1. Get Authentication Token
    let token = account.access_token;
    if (!token || token.startsWith('mock_')) {
      const authRes = await axios.post(`${TCS_BASE_URL}/authentication/token`, {
        username: account.username,
        password: decrypt(account.password)
      });
      token = authRes.data?.accesstoken || authRes.data?.token;
      if (!token) throw new Error("Could not retrieve access token from TCS.");
    }

    // 2. Build TCS Payload
    const tcsPayload = {
      accesstoken: token,
      tcsaccount: account.account_number,
      consignmentno: null,
      shipmentDetails: {
        shipperName: shop,
        shipperPhone: "", 
        shipperAddress: account.pickup_address || "Default Address",
        consigneeName: bookingDetails.consigneeName,
        consigneePhone: bookingDetails.consigneePhone,
        consigneeAddress: bookingDetails.consigneeAddress || "Not Provided",
        destinationCity: bookingDetails.consigneeCity,
        weight: parseFloat(account.default_weight) || 0.5,
        pieces: parseInt(bookingDetails.pieces) || 1,
        codAmount: parseFloat(bookingDetails.codAmount) || 0,
        customerReferenceNo: orderId,
        services: account.service_type || "Express",
        remarks: account.shipper_remarks || "",
        insuranceValue: account.has_insurance ? (account.default_insurance || 0) : 0,
        fragile: account.is_fragile ? "Yes" : "No"
      }
    };

    // 3. Make the API Call to create booking
    const response = await axios.post(`${TCS_BASE_URL}/booking/create`, tcsPayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    if (!data || data.error) {
      throw new Error(data?.message || data?.error || "Failed to create booking on TCS.");
    }

    const trackingNumber = data.consignmentno || data.trackingNumber || data.cn;

    if (!trackingNumber) {
       throw new Error("TCS API responded with success but tracking number was missing.");
    }

    // Save to database for logs
    await bookingService.saveBooking({
      shop,
      orderId: bookingDetails.orderId,
      courier: 'TCS',
      trackingNumber: trackingNumber,
      consigneeName: bookingDetails.consigneeName,
      consigneePhone: bookingDetails.consigneePhone,
      consigneeCity: bookingDetails.consigneeCity,
      codAmount: parseFloat(bookingDetails.codAmount),
      orderAmount: parseFloat(bookingDetails.orderAmount || bookingDetails.codAmount),
      accountId: accountId
    });

    return { success: true, trackingNumber };
  } catch (error) {
    console.error('TCS Booking Error:', error.response?.data || error.message);
    throw new Error('Failed to book shipment with TCS: ' + (error.response?.data?.message || error.message));
  }
}

async function deleteAccount(id, shop) {
  try {
    // Only delete if it belongs to the shop to prevent unauthorized deletion
    await db.query('DELETE FROM tcs_accounts WHERE id = $1 AND shop_domain = $2', [id, shop]);
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new Error('Failed to delete account');
  }
}

async function toggleAccountStatus(id, shop, isEnabled) {
  try {
    await db.query('UPDATE tcs_accounts SET is_enabled = $1 WHERE id = $2 AND shop_domain = $3', [isEnabled, id, shop]);
  } catch (error) {
    console.error('Error toggling account status:', error);
    throw new Error('Failed to toggle account status');
  }
}

async function fetchLoadsheets(shop, fromDate, toDate) {
  const accounts = await getAccounts(shop);
  const activeAccount = accounts.find(a => a.is_default && a.is_enabled) || accounts[0];
  
  if (!activeAccount) {
    throw new Error('No active TCS account found.');
  }

  let token = activeAccount.access_token;
  const customerno = activeAccount.account_number;

  try {
    if (!token || token.startsWith('mock_')) {
      const authRes = await axios.post(`${TCS_BASE_URL}/authentication/token`, {
        username: activeAccount.username,
        password: decrypt(activeAccount.password)
      });
      token = authRes.data?.accesstoken || authRes.data?.token;
    }

    const response = await axios.get(`${TCS_BASE_URL}/report/loadsheetlogs`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        accesstoken: token,
        customerno: customerno,
        fromdate: fromDate,
        todate: toDate
      }
    });

    // Assume response.data is the array of loadsheet logs
    return response.data;
  } catch (error) {
    console.error('TCS Fetch Loadsheets Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch loadsheets from TCS API.');
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
