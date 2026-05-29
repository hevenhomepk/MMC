// src/client/components/CourierLogs.jsx
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
    minWidth: '120px'
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
    gap: '8px'
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

export default function CourierLogs({ shop, courierFilter }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showActions, setShowActions] = useState(false);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/bookings?shop=${shop}`);
        const data = await resp.json();
        if (data.success) setBookings(data.bookings);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchLogs();
  }, [shop]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredLogs = useMemo(() => {
    let result = bookings.filter(b => {
      const matchTabStatus = activeTab === 'All' || b.status === activeTab;
      const matchFilterStatus = !filterStatus || b.status === filterStatus;
      const matchCourier = !courierFilter || b.courier === courierFilter;
      
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        b.order_id.toLowerCase().includes(q) ||
        b.tracking_number.toLowerCase().includes(q) ||
        b.consignee_name.toLowerCase().includes(q) ||
        (b.consignee_phone && b.consignee_phone.includes(q)) ||
        b.consignee_city.toLowerCase().includes(q);
      
      return matchTabStatus && matchFilterStatus && matchSearch && matchCourier;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [bookings, activeTab, searchQuery, filterStatus, courierFilter, sortConfig]);

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ marginLeft: '4px', color: '#3b82f6' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const tableHeaders = [
    { key: 'created_at', label: 'Date' },
    { key: 'order_id', label: 'Order' },
    { key: 'consignee_name', label: 'Name' },
    { key: 'consignee_phone', label: 'Phone' },
    { key: 'consignee_city', label: 'City' },
    { key: 'cod_amount', label: 'COD' },
    { key: 'courier', label: 'Courier' },
    { key: 'tracking_number', label: 'Tracking' },
    { key: 'status', label: 'Status' },
    { key: 'result', label: 'Result' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>
          {courierFilter ? `${courierFilter} Logs` : 'All Courier Logs'}
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
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Search Orders</div>
          <input 
            type="text" 
            placeholder="Search orders..." 
            style={{ ...styles.input, width: '100%', height: '42px', fontSize: '15px' }} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
        
        <div style={{ width: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Status</div>
          <select 
            style={{ ...styles.input, width: '100%', height: '42px' }} 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Select Status</option>
            {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', position: 'relative' }}>
          <button style={{ ...styles.btn('primary'), height: '42px' }}>Search</button>
          <button style={{ ...styles.btn(), height: '42px' }}>Print</button>
          <button style={{ ...styles.btn('secondary'), height: '42px', border: '1px solid #3b82f6', color: '#3b82f6' }}>Track</button>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowActions(!showActions)}
              style={{ 
                ...styles.btn(), 
                height: '42px', 
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
                top: '48px',
                right: 0,
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                border: '1px solid var(--border)',
                zIndex: 100,
                minWidth: '180px',
                overflow: 'hidden'
              }}>
                {['Sales Report', 'Item Report', 'Download Report', 'Change Status'].map(opt => (
                  <div 
                    key={opt}
                    onClick={() => { alert(opt + ' clicked'); setShowActions(false); }}
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#1e293b',
                      cursor: 'pointer',
                      transition: '.2s',
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.target.style.background = '#fff'}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '40px' }}><input type="checkbox" /></th>
              <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => requestSort('id')}>
                # <SortIcon col="id" />
              </th>
              {tableHeaders.map(h => (
                <th 
                  key={h.key} 
                  style={{ ...styles.th, cursor: 'pointer' }} 
                  onClick={() => requestSort(h.key)}
                >
                  {h.label} <SortIcon col={h.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((b, i) => (
              <tr key={b.id}>
                <td style={styles.td}><input type="checkbox" /></td>
                <td style={styles.td}>{i + 1}</td>
                <td style={styles.td}>{new Date(b.created_at).toLocaleDateString()}</td>
                <td style={{ ...styles.td, fontWeight: '700' }}>{b.order_id}</td>
                <td style={styles.td}>{b.consignee_name}</td>
                <td style={styles.td}>{b.consignee_phone || '-'}</td>
                <td style={styles.td}>{b.consignee_city}</td>
                <td style={styles.td}>Rs. {b.cod_amount}</td>
                <td style={styles.td}>{b.courier}</td>
                <td style={{ ...styles.td, color: '#3b82f6', fontWeight: '700' }}>{b.tracking_number}</td>
                <td style={styles.td}>
                  <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '800', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', textTransform: 'uppercase' }}>
                    {b.status}
                  </span>
                </td>
                <td style={styles.td}>-</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="12" style={{ ...styles.td, textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No logs found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
