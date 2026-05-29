// src/client/components/BookingList.jsx
import React, { useState, useEffect } from 'react';
import AddBooking from './AddBooking';

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    background: 'var(--surface, #ffffff)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--border, #e2e8f0)'
  },
  th: {
    textAlign: 'left',
    padding: '16px',
    background: 'var(--surface2, #f8fafc)',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--muted, #64748b)',
    borderBottom: '1px solid var(--border, #e2e8f0)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    borderBottom: '1px solid var(--border, #e2e8f0)',
    color: 'var(--text, #0f172a)'
  },
  badge: (type) => ({
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    background: type === 'TCS' ? 'rgba(239,68,68,0.1)' : 'rgba(0,230,118,0.1)',
    color: type === 'TCS' ? '#ef4444' : '#00e676',
    border: `1px solid ${type === 'TCS' ? 'rgba(239,68,68,0.2)' : 'rgba(0,230,118,0.2)'}`
  }),
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    background: 'rgba(59,130,246,0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.2)'
  },
  btnPrimary: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #00e676, #00c853)',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,230,118,0.2)'
  }
};

export default function BookingList({ shop }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/bookings?shop=${shop}`);
      const data = await resp.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (e) {
      console.error('Error fetching bookings', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [shop]);

  if (showAddForm) {
    return (
      <div>
        <button 
          onClick={() => {
            setShowAddForm(false);
            fetchBookings();
          }}
          style={{ marginBottom: '20px', padding: '8px 16px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Back to List
        </button>
        <AddBooking shop={shop} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>📋 Bookings</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>Manage and track all your shipments.</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowAddForm(true)}>
          + New Booking
        </button>
      </div>

      {loading ? (
        <p>Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>No bookings found yet.</p>
          <button style={{ ...styles.btnPrimary, marginTop: '16px' }} onClick={() => setShowAddForm(true)}>Create Your First Booking</button>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Order ID</th>
              <th style={styles.th}>Courier</th>
              <th style={styles.th}>Tracking Number</th>
              <th style={styles.th}>Consignee</th>
              <th style={styles.th}>City</th>
              <th style={styles.th}>COD Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id}>
                <td style={{ ...styles.td, fontWeight: '700' }}>{b.order_id}</td>
                <td style={styles.td}>
                  <span style={styles.badge(b.courier)}>{b.courier}</span>
                </td>
                <td style={{ ...styles.td, color: '#3b82f6', fontWeight: '600' }}>{b.tracking_number}</td>
                <td style={styles.td}>{b.consignee_name}</td>
                <td style={styles.td}>{b.consignee_city}</td>
                <td style={{ ...styles.td, fontWeight: '700' }}>Rs {parseFloat(b.cod_amount).toLocaleString()}</td>
                <td style={styles.td}>
                  <span style={styles.statusBadge}>{b.status}</span>
                </td>
                <td style={{ ...styles.td, color: 'var(--muted)', fontSize: '12px' }}>
                  {new Date(b.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
