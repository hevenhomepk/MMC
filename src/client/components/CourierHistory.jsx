// src/client/components/CourierHistory.jsx
import React, { useState, useEffect } from 'react';

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'var(--surface)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--border)'
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    background: 'var(--surface2)',
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--muted)',
    borderBottom: '2px solid var(--border)',
    textTransform: 'uppercase'
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text)'
  },
  status: {
    padding: '4px 10px',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase'
  }
};

export default function CourierHistory({ shop, courierId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/bookings?shop=${shop}`);
        const data = await resp.json();
        if (data.success) {
          // Filter by courier name (TCS or PostEx)
          const filtered = data.bookings.filter(b => b.courier.toLowerCase() === courierId.toLowerCase());
          setBookings(filtered);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchHistory();
  }, [shop, courierId]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this booking? This will return the order to the booking workbench.')) return;
    try {
      const resp = await fetch(`/api/bookings/${id}?shop=${shop}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) {
        setBookings(prev => prev.filter(b => b.id !== id));
      } else {
        alert('Failed to delete booking: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server.');
    }
  };

  const courierName = courierId === 'tcs' ? 'TCS Courier' : 'PostEx';

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>📋 {courierName} Bookings</h2>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Complete history of shipments booked through {courierName}.</p>
        </div>
        <button 
          onClick={() => window.location.hash = `#${courierId}`}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '8px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)', 
            color: 'var(--text)',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚙️ Manage {courierName} Accounts
        </button>
      </div>

      {loading ? <p>Loading history...</p> : (
        <div style={{ overflowX: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderRadius: '12px' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Order #</th>
                <th style={styles.th}>Consignment Number (CN)</th>
                <th style={styles.th}>Consignee</th>
                <th style={styles.th}>City</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{b.order_id}</td>
                  <td style={{ ...styles.td, color: '#3b82f6', fontWeight: '700' }}>{b.tracking_number}</td>
                  <td style={styles.td}>{b.consignee_name}</td>
                  <td style={styles.td}>{b.consignee_city}</td>
                  <td style={styles.td}>Rs. {b.cod_amount}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.status, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                      Booked
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: 'var(--muted)', fontSize: '12px' }}>
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <button 
                      onClick={() => handleDelete(b.id)}
                      style={{ 
                        background: 'rgba(239,68,68,0.1)', 
                        color: '#ef4444', 
                        border: '1px solid rgba(239,68,68,0.2)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: '.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'rgba(239,68,68,0.2)'}
                      onMouseOut={(e) => e.target.style.background = 'rgba(239,68,68,0.1)'}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No bookings found for this courier.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
