import React, { useState, useEffect, useMemo } from 'react';

const STATUSES = ['All', 'Booked', 'Shipped', 'Loadsheet', 'Assigned', 'Pending', 'Refused', 'Delivered', 'Returned', 'RTS', 'Cancelled'];

const styles = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' },
  tab: (active) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid ' + (active ? '#3b82f6' : 'var(--border)'),
    background: active ? '#3b82f6' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: '.2s'
  }),
  filterBar: {
    background: 'var(--surface2)',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  input: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
    minWidth: '120px',
    height: '38px'
  },
  btn: (type) => ({
    padding: '8px 20px',
    borderRadius: '8px',
    border: type === 'primary' ? 'none' : '1px solid var(--border)',
    background: type === 'primary' ? 'var(--green)' : 'var(--surface)',
    color: type === 'primary' ? '#fff' : 'var(--text)',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '38px'
  }),
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
    background: '#1e293b',
    fontSize: '11px',
    fontWeight: '800',
    color: '#fff',
    borderBottom: '2px solid var(--border)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text)'
  }
};

export default function ReturnPending({ shop }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  // Selected checkbox booking IDs
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [trackingQuery, setTrackingQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const fetchReturnPending = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/returns/bookings?shop=${shop}&return_status=Return Pending`);
        const data = await resp.json();
        if (data.success) {
          setBookings(data.bookings);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchReturnPending();
  }, [shop]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(bookings.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkReceive = async () => {
    if (selectedIds.length === 0) return alert('No return shipments selected!');
    
    try {
      const resp = await fetch('/api/returns/bookings/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, bookingIds: selectedIds })
      });
      const data = await resp.json();

      if (data.success) {
        alert(data.message || 'Returns received successfully!');
        setBookings(prev => prev.filter(b => !selectedIds.includes(b.id)));
        setSelectedIds([]);
      } else {
        alert(data.message || 'Error updating returns');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const filteredLogs = useMemo(() => {
    return bookings.filter(b => {
      const matchTab = activeTab === 'All' || b.status === activeTab;
      const matchDate = !dateQuery || new Date(b.created_at).toLocaleDateString().includes(dateQuery);
      const matchOrder = !orderQuery || b.order_id.toLowerCase().includes(orderQuery.toLowerCase());
      const matchTracking = !trackingQuery || b.tracking_number.toLowerCase().includes(trackingQuery.toLowerCase());
      const matchPhone = !phoneQuery || (b.consignee_phone && b.consignee_phone.includes(phoneQuery));
      return matchTab && matchDate && matchOrder && matchTracking && matchPhone;
    });
  }, [bookings, activeTab, dateQuery, orderQuery, trackingQuery, phoneQuery]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ fontSize: '28px', fontWeight: '900', margin: 0, color: 'var(--text)' }}>
          All
        </h2>
      </div>

      <div style={styles.tabs}>
        {STATUSES.map(s => (
          <button key={s} style={styles.tab(activeTab === s)} onClick={() => setActiveTab(s)}>
            {s}
          </button>
        ))}
      </div>

      <div style={styles.filterBar}>
        <input 
          type="text" 
          placeholder="Date" 
          style={styles.input} 
          value={dateQuery}
          onChange={e => setDateQuery(e.target.value)}
        />
        <input 
          type="text" 
          placeholder="Order" 
          style={styles.input} 
          value={orderQuery}
          onChange={e => setOrderQuery(e.target.value)}
        />
        <input 
          type="text" 
          placeholder="Tracking" 
          style={styles.input} 
          value={trackingQuery}
          onChange={e => setTrackingQuery(e.target.value)}
        />
        <input 
          type="text" 
          placeholder="Phone" 
          style={styles.input} 
          value={phoneQuery}
          onChange={e => setPhoneQuery(e.target.value)}
        />
        
        <select style={{ ...styles.input, minWidth: '160px' }} defaultValue="Return Pending">
          <option value="Return Pending">Return Pending</option>
        </select>

        <button style={styles.btn('primary')}>Search</button>
        <button style={styles.btn()}>Print</button>
        <button style={{ ...styles.btn(), border: '1px solid #3b82f6', color: '#3b82f6' }}>Track</button>

        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowActions(!showActions)}
            style={{ 
              ...styles.btn(), 
              background: '#64748b', 
              color: '#fff', 
              border: 'none',
              minWidth: '110px',
              justifyContent: 'space-between'
            }}
          >
            Actions <span style={{ fontSize: '10px' }}>▼</span>
          </button>

          {showActions && (
            <div style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              border: '1px solid var(--border)',
              zIndex: 100,
              minWidth: '180px',
              overflow: 'hidden'
            }}>
              <div 
                onClick={handleBulkReceive}
                style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', cursor: 'pointer', transition: '.2s', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                onMouseOut={(e) => e.target.style.background = '#fff'}
              >
                Mark Received
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '40px' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={selectedIds.length > 0 && selectedIds.length === bookings.length} 
                />
              </th>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Order</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>City</th>
              <th style={styles.th}>COD</th>
              <th style={styles.th}>Courier</th>
              <th style={styles.th}>Tracking</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Result</th>
              <th style={styles.th}>-</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13" style={{ ...styles.td, textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  Loading Return Pending logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ ...styles.td, textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No pending return shipments found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((b, i) => (
                <tr key={b.id}>
                  <td style={styles.td}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(b.id)} 
                      onChange={() => handleSelectOne(b.id)} 
                    />
                  </td>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, fontWeight: '700', color: '#10b981' }}>{b.order_id}</td>
                  <td style={styles.td}>{b.consignee_name}</td>
                  <td style={styles.td}>{b.consignee_phone || '-'}</td>
                  <td style={styles.td}>{b.consignee_city}</td>
                  <td style={styles.td}>Rs. {b.cod_amount}</td>
                  <td style={styles.td}>{b.courier}</td>
                  <td style={{ ...styles.td, color: '#3b82f6', fontWeight: '700' }}>{b.tracking_number}</td>
                  <td style={styles.td}>
                    <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '800', background: 'rgba(239,68,68,0.1)', color: '#ef4444', textTransform: 'uppercase' }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: '#ef4444', fontWeight: '800' }}>RTS</td>
                  <td style={styles.td}>
                    {b.consignee_phone && (
                      <a href={`https://wa.me/${b.consignee_phone}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366' }}>
                        💬
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
