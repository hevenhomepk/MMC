const db = require('../db');

// In real app, fetch from Shopify Admin API
async function getUnfulfilledOrders(shop) {
  // 1. Fetch raw orders from Shopify (Mocked here)
  const rawOrders = [
    {
      id: 'gid://shopify/Order/123456789',
      order_number: '#1024',
      customer_name: 'Ali Khan',
      mobile: '03001234567',
      city: 'Lahore',
      address: 'House 123, Street 4, Phase 5, DHA',
      email: 'ali@example.com',
      total_price: '2500.00',
      created_at: '2026-05-10T10:00:00Z',
      line_items: '2x Black T-Shirts',
      service_type: 'O', // Overnight
      insurance: '0.00',
      fragile: false,
      weight: '0.5',
      pieces: '1',
      remarks: 'Please call before delivery'
    },
    {
      id: 'gid://shopify/Order/987654321',
      order_number: '#1025',
      customer_name: 'Sara Ahmed',
      mobile: '03219876543',
      city: 'Karachi',
      address: 'Apartment 4B, Ocean View Towers',
      email: 'sara@example.com',
      total_price: '4800.00',
      created_at: '2026-05-10T11:30:00Z',
      line_items: '1x Designer Handbag',
      service_type: 'O',
      insurance: '100.00',
      fragile: true,
      weight: '1.2',
      pieces: '1',
      remarks: 'Handle with care'
    },
    {
      id: 'gid://shopify/Order/456789123',
      order_number: '#1026',
      customer_name: 'Usman Malik',
      mobile: '03335556677',
      city: 'Islamabad',
      address: 'Plot 15, Sector F-7',
      email: 'usman@example.com',
      total_price: '1200.00',
      created_at: '2026-05-10T12:15:00Z',
      line_items: '3x Cotton Socks',
      service_type: 'O',
      insurance: '0.00',
      fragile: false,
      weight: '0.3',
      pieces: '1',
      remarks: ''
    }
  ];

  // 2. Cross-reference with our local bookings table to see if any are already booked
  try {
    const existingBookingsRes = await db.query(
      `SELECT order_id, tracking_number FROM bookings WHERE shop_domain = $1`,
      [shop]
    );
    const bookedMap = {};
    existingBookingsRes.rows.forEach(row => {
      bookedMap[row.order_id] = row.tracking_number;
    });

    // 3. Attach tracking number if found locally
    return rawOrders.map(order => ({
      ...order,
      tracking_number: bookedMap[order.order_number] || null
    }));
  } catch (error) {
    console.error('Error cross-referencing orders with bookings:', error);
    return rawOrders;
  }
}

module.exports = {
  getUnfulfilledOrders
};
