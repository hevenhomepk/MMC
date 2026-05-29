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

// Fixed token provided by user for DEV API
const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjpbIlRyYWNrIiwiRWNvbSIsIk5vdGlmaWNhdGlvbiJdLCJjbGllbnRpZCI6IjIxNTYxMDU1MiIsInNlcnZpY2VzIjoiMTAzLDE1NSwxNjEsMTY0LDIyNSwyNDcsMjQ4LDI0OSwyNTAsMjUxLDI3NywyOTMsNDQ4LDQ0OSw0NTAsNDUxLDQ1Miw0NTMsNDU0LDEwMTAiLCJleGNsdWRlZC1zZXJ2aWNlcyI6IiIsImlzcyI6InVhdC1taWRkbGV3YXJlLnRyYW56dW1way5jb20iLCJqdGkiOiI4MzMzNDRiNC0zNDQ0LTRhY2EtODhhNi1lN2VlNWQ3NGYzMzEiLCJuYmYiOjE3NTMwOTY3NTAsImV4cCI6MTgzOTQ5Njc1MCwiaWF0IjoxNzUzMDk2NzUwfQ.DIx4XCcda3QuVrp0HVaE7DB9Gz6eMn4d_jPUsFG16V0';

async function validateAndFetchPickups({ username, password, accountNumber }) {
  // Since the specific endpoint to fetch cost centers wasn't provided, we simulate the API call.
  // In production, this would make an axios call with the Bearer token.
  try {
    /* 
    // Example of actual call:
    const response = await axios.get('https://devconnect.tcscourier.com/api/costCenters', {
      headers: {
        'Authorization': `Bearer ${DEV_TOKEN}`,
        'X-Username': username,
        'X-Password': password,
        'X-AccountNumber': accountNumber
      }
    });
    return { pickups: response.data };
    */
    
    // Simulating successful validation and fetching of cost centers
    if (!username || !password || !accountNumber) {
        throw new Error("Missing credentials");
    }

    return {
      accessToken: 'mock_jwt_access_token_' + Math.floor(Math.random() * 100000), // Simulated token
      pickups: [
        { id: 'RANA-01', name: 'RANA - 03331234567 - Pickup Address 1' },
        { id: 'RANA-02', name: 'RANA - 03331234567 - Pickup Address 2' }
      ]
    };
  } catch (err) {
    console.error('Validation error:', err);
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

  // In a real implementation, we would now map 'bookingDetails' and 'account' 
  // credentials into a TCS API request, such as POST https://devconnect.tcscourier.com/api/shipment

  // Simulate TCS API call delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Simulate success with a generated tracking number
  const trackingNumber = 'TCS-' + Math.floor(Math.random() * 1000000000);

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

  const token = activeAccount.access_token || DEV_TOKEN;
  const customerno = activeAccount.account_number;

  try {
    const response = await axios.get('https://devconnect.tcscourier.com/ecom/api/report/loadsheetlogs', {
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
