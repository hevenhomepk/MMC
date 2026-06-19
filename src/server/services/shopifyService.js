const db = require('../db');
const axios = require('axios');

async function getUnfulfilledOrders(shop) {
  try {
    // Basic Auth using provided credentials
    const username = 'hevenhomepk@gmail.com';
    const password = 'Swkbv@15';
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    
    // Explicitly use the requested Shopify store domain
    const targetShop = 'codorders.myshopify.com';

    // Make the API call to Shopify
    // Note: Shopify typically uses X-Shopify-Access-Token, but since email/password were explicitly provided,
    // we use Basic Auth. If this is a private app, the API Key goes in the username field.
    const response = await axios.get(`https://${targetShop}/admin/api/2024-04/orders.json?status=unfulfilled`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const shopifyOrders = response.data.orders || [];

    // Map Shopify order structure to our unified application structure
    const rawOrders = shopifyOrders.map(order => {
      const shipping = order.shipping_address || {};
      const customer = order.customer || {};
      
      const firstName = shipping.first_name || customer.first_name || '';
      const lastName = shipping.last_name || customer.last_name || '';
      const fullName = shipping.name || `${firstName} ${lastName}`.trim();

      const address1 = shipping.address1 || '';
      const address2 = shipping.address2 || '';
      const fullAddress = [address1, address2].filter(Boolean).join(', ');

      const totalWeightGrams = order.total_weight || 0;
      const weightKg = (totalWeightGrams / 1000).toFixed(2);
      
      const pieces = order.line_items ? order.line_items.reduce((acc, item) => acc + item.quantity, 0) : 1;
      const lineItemsDesc = order.line_items ? order.line_items.map(i => `${i.quantity}x ${i.name}`).join(', ') : '';

      return {
        id: order.admin_graphql_api_id || `gid://shopify/Order/${order.id}`,
        order_number: order.name || `#${order.order_number}`,
        customer_name: fullName,
        mobile: shipping.phone || customer.phone || '',
        city: shipping.city || '',
        address: fullAddress,
        email: order.email || customer.email || '',
        total_price: order.current_total_price || order.total_price || '0.00',
        created_at: order.created_at,
        line_items: lineItemsDesc,
        service_type: 'O', // Default: Overnight
        insurance: '0.00',
        fragile: false,
        weight: weightKg > 0 ? weightKg : '0.5',
        pieces: pieces.toString(),
        remarks: order.note || ''
      };
    });

    // Cross-reference with our local bookings table to see if any are already booked
    const existingBookingsRes = await db.query(
      `SELECT order_id, tracking_number FROM bookings WHERE shop_domain = $1`,
      [shop]
    );
    
    const bookedMap = {};
    existingBookingsRes.rows.forEach(row => {
      bookedMap[row.order_id] = row.tracking_number;
    });

    // Attach tracking number if found locally
    return rawOrders.map(order => ({
      ...order,
      tracking_number: bookedMap[order.order_number] || null
    }));
    
  } catch (error) {
    console.error('Error fetching orders from Shopify:', error.message);
    if (error.response) {
      console.error('Shopify API Error Response:', error.response.data);
    }
    // Return empty array on failure instead of crashing
    return [];
  }
}

module.exports = {
  getUnfulfilledOrders
};
