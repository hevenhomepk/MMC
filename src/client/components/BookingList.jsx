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
  linkBtn: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border, #e2e8f0)',
    background: 'transparent',
    color: 'var(--text, #0f172a)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
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

// Color-code the courier status badge by lifecycle stage.
function statusColor(status) {
  const s = (status || '').toLowerCase();
  if (/delivered/.test(s))              return { bg: 'rgba(16,185,129,0.12)', fg: '#10b981', bd: 'rgba(16,185,129,0.25)' }; // green
  if (/return to shipper|failed|failure/.test(s)) return { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444', bd: 'rgba(239,68,68,0.25)' }; // red
  if (/out for delivery/.test(s))       return { bg: 'rgba(245,158,11,0.14)', fg: '#f59e0b', bd: 'rgba(245,158,11,0.28)' }; // amber
  if (/transit|arrived|facility|received|departed|pickup|collection/.test(s)) return { bg: 'rgba(59,130,246,0.10)', fg: '#3b82f6', bd: 'rgba(59,130,246,0.2)' }; // blue
  return { bg: 'rgba(100,116,139,0.12)', fg: '#64748b', bd: 'rgba(100,116,139,0.22)' }; // slate (Booked/unknown)
}

function StatusBadge({ status }) {
  const c = statusColor(status);
  return (
    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      {status || 'Booked'}
    </span>
  );
}

// Read-only timeline modal. Renders the cached tracking_detail (populated by the
// background poller); it never triggers a live TCS call.
function TrackingModal({ booking, onClose }) {
  let detail = null;
  try { detail = booking.tracking_detail ? JSON.parse(booking.tracking_detail) : null; } catch { detail = null; }
  const checkpoints = (detail && detail.checkpoints) || [];
  const delivery    = (detail && detail.deliveryinfo) || [];
  const info        = detail && detail.shipmentinfo;
  // Prefer the richer checkpoint list; fall back to delivery entries.
  const timeline = checkpoints.length ? checkpoints : delivery;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface, #fff)', color: 'var(--text, #0f172a)', borderRadius: '14px', maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Tracking · {booking.tracking_number}</h3>
            <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <StatusBadge status={booking.status} />
              {booking.last_tracked_at && (
                <span style={{ fontSize: '12px', color: 'var(--muted, #64748b)' }}>
                  Updated {new Date(booking.last_tracked_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--muted, #64748b)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {info && (
            <div style={{ fontSize: '13px', color: 'var(--muted, #64748b)', marginBottom: '16px' }}>
              {info.origin} → {info.destination}{info.bookingdate ? ` · Booked ${info.bookingdate}` : ''}
            </div>
          )}
          {timeline.length === 0 ? (
            <p style={{ color: 'var(--muted, #64748b)', fontSize: '14px' }}>
              No tracking checkpoints yet. Status refreshes automatically.
            </p>
          ) : (
            <div style={{ position: 'relative' }}>
              {timeline.map((cp, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', paddingBottom: i === timeline.length - 1 ? 0 : '18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: i === 0 ? statusColor(booking.status).fg : '#cbd5e1', marginTop: '3px', flexShrink: 0 }} />
                    {i !== timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--border, #e2e8f0)', marginTop: '2px' }} />}
                  </div>
                  <div style={{ paddingBottom: '2px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{cp.status}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted, #64748b)' }}>
                      {cp.datetime}{cp.recievedby ? ` · ${cp.recievedby}` : ''}{cp.station ? ` · ${cp.station}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingList({ shop }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [trackingBooking, setTrackingBooking] = useState(null);

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
              <th style={styles.th}>Tracking</th>
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
                  <StatusBadge status={b.status} />
                </td>
                <td style={{ ...styles.td, color: 'var(--muted)', fontSize: '12px' }}>
                  {new Date(b.created_at).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <button style={styles.linkBtn} onClick={() => setTrackingBooking(b)}>Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {trackingBooking && (
        <TrackingModal booking={trackingBooking} onClose={() => setTrackingBooking(null)} />
      )}
    </div>
  );
}
