// src/client/components/BookingWorkbench.jsx
import React, { useState, useEffect, useMemo } from 'react';

const PAKISTAN_CITIES = [
  "Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Peshawar", "Multan", 
  "Hyderabad", "Islamabad", "Quetta", "Bahawalpur", "Sargodha", "Sialkot", "Sukkur", 
  "Larkana", "Sheikhupura", "Rahim Yar Khan", "Jhang", "Dera Ghazi Khan", "Gujrat", 
  "Sahiwal", "Wah Cantonment", "Mardan", "Kasur", "Okara", "Mingora", "Nawabshah", 
  "Chiniot", "Kotri", "Kāmoke", "Hafizabad", "Sadiqabad", "Mirpur Khas", "Burewala", 
  "Kohat", "Khanewal", "Dera Ismail Khan", "Gojra", "Mandi Bahauddin", "Abbottabad", "Turbat"
].sort();

const ALL_COLUMNS = [
  { key: 'order_number', label: 'Order #', type: 'text' },
  { key: 'customer_name', label: 'Consignee', type: 'text' },
  { key: 'mobile', label: 'Mobile', type: 'text' },
  { key: 'city', label: 'City', type: 'city-dropdown' },
  { key: 'address', label: 'Complete Address', type: 'textarea' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'total_price', label: 'COD Amount', type: 'number' },
  { key: 'service_type', label: 'Service', type: 'select', options: [{v:'O', l:'Overnight'}, {v:'2', l:'Second Day'}, {v:'E', l:'Economy'}] },
  { key: 'weight', label: 'Weight (kg)', type: 'number' },
  { key: 'pieces', label: 'Pieces', type: 'number' },
  { key: 'insurance', label: 'Insurance', type: 'number' },
  { key: 'fragile', label: 'Fragile', type: 'checkbox' },
  { key: 'remarks', label: 'Remarks', type: 'text' },
  { key: 'created_at', label: 'Order Date', type: 'date', readOnly: true }
];

const DEFAULT_COLUMNS = ['order_number', 'customer_name', 'mobile', 'city', 'address', 'total_price'];

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
    padding: '12px 16px',
    background: 'var(--surface2, #f8fafc)',
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--muted, #64748b)',
    borderBottom: '2px solid var(--border, #e2e8f0)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '0',
    fontSize: '13px',
    borderBottom: '1px solid var(--border, #e2e8f0)',
    color: 'var(--text, #0f172a)',
    verticalAlign: 'top'
  },
  input: {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    minHeight: '60px',
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  btnPrimary: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
  },
  controlPanel: {
    background: 'var(--card)',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
  },
  dropdown: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    height: '44px'
  },
  colBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface2)',
    color: 'var(--text)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: '.2s'
  }
};

export default function BookingWorkbench({ shop }) {
  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  
  // Selection States
  const [selectedCourier, setSelectedCourier] = useState('tcs');
  const [selectedAccount, setSelectedAccount] = useState('');
  
  // Search and Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('booking_workbench_columns_v7');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  
  const [isBooking, setIsBooking] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersResp, tcsAccsResp, postexAccsResp] = await Promise.all([
          fetch(`/api/shopify/orders?shop=${shop}`),
          fetch(`/api/tcs/accounts?shop=${shop}`),
          fetch(`/api/postex/accounts?shop=${shop}`)
        ]);
        
        const ordersData = await ordersResp.json();
        const tcsData = await tcsAccsResp.json();
        const postexData = await postexAccsResp.json();
        
        if (ordersData.success) setOrders(ordersData.orders);
        
        let allAccs = [];
        if (tcsData.success) allAccs = [...allAccs, ...tcsData.accounts.filter(a=>a.is_enabled).map(a=>({...a, courier: 'tcs'}))];
        if (postexData.success) allAccs = [...allAccs, ...postexData.accounts.filter(a=>a.is_enabled).map(a=>({...a, courier: 'postex'}))];
        
        setAccounts(allAccs);
        
        const defAcc = allAccs.find(a => a.courier === 'tcs' && a.is_default) || allAccs.find(a => a.courier === 'tcs') || allAccs[0];
        if (defAcc) {
          setSelectedCourier(defAcc.courier);
          setSelectedAccount(defAcc.id);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [shop]);

  useEffect(() => {
    localStorage.setItem('booking_workbench_columns_v7', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const filteredAccounts = accounts.filter(a => a.courier === selectedCourier);

  const handleUpdateOrder = (id, key, value) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, [key]: value } : o));
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]);
  };

  const handleProcessBooking = async () => {
    if (!selectedAccount) return alert("Please select a courier account first.");
    if (selectedOrderIds.length === 0) return alert("Please select at least one order.");
    
    setIsBooking(true);
    setErrors([]);
    let successCount = 0;
    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
    
    for (let i = 0; i < selectedOrders.length; i++) {
      setBulkStatus({ current: i + 1, total: selectedOrders.length });
      const order = selectedOrders[i];
      
      try {
        const endpoint = selectedCourier === 'tcs' ? '/api/tcs/book' : '/api/postex/book';
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop,
            accountId: selectedAccount,
            bookingDetails: {
              consigneeName: order.customer_name,
              consigneePhone: order.mobile,
              consigneeEmail: order.email,
              consigneeCity: order.city,
              consigneeAddress: order.address,
              orderId: order.order_number,
              productDesc: order.line_items,
              pieces: order.pieces || '1',
              weight: order.weight || '0.5',
              codAmount: order.total_price,
              serviceType: order.service_type || 'O',
              fragile: order.fragile || false,
              insurance: order.insurance || '0',
              remarks: order.remarks || ''
            }
          })
        });
        
        const result = await resp.json();
        if (result.success && result.trackingNumber) {
          successCount++;
          handleUpdateOrder(order.id, 'tracking_number', result.trackingNumber);
        } else {
          const errMsg = result.error || 'No tracking number returned by courier';
          setErrors(prev => [...prev, `Order ${order.order_number}: ${errMsg}`]);
        }
      } catch (err) { 
        setErrors(prev => [...prev, `Order ${order.order_number}: Network or Server Error`]);
        console.error(err); 
      }
    }
    
    setBulkStatus(null);
    setIsBooking(false);
    if (successCount > 0 || errors.length > 0) {
       // Only alert if there were successes or if everything failed
       if (errors.length === 0) {
         alert(`✅ Success! ${successCount} orders booked successfully.`);
       } else {
         alert(`⚠️ Process Finished. ${successCount} orders booked. ${errors.length} orders failed. Check error log below.`);
       }
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    // Show only unbooked orders (those without a tracking number)
    let result = orders.filter(o => !o.tracking_number);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.order_number.toLowerCase().includes(term) ||
        o.customer_name.toLowerCase().includes(term) ||
        o.city.toLowerCase().includes(term)
      );
    }
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aV = a[sortConfig.key]; let bV = b[sortConfig.key];
        if (['total_price', 'insurance', 'weight', 'pieces'].includes(sortConfig.key)) {
          aV = parseFloat(aV || 0); bV = parseFloat(bV || 0);
        }
        if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [orders, searchTerm, sortConfig]);

  const activeColumns = ALL_COLUMNS.filter(col => visibleColumns.includes(col.key));

  const renderCell = (o, col) => {
    if (col.readOnly) {
      const val = o[col.key];
      return (
        <div style={{ padding: '12px 16px', color: col.key === 'tracking_number' ? '#16a34a' : 'var(--muted)', fontSize: '13px', fontWeight: col.key === 'tracking_number' ? '800' : '400' }}>
          {col.key === 'created_at' ? new Date(val).toLocaleDateString() : (val || '-')}
        </div>
      );
    }
    if (col.type === 'city-dropdown') {
      const isInvalid = !PAKISTAN_CITIES.includes(o[col.key]);
      return (
        <div style={{ padding: '4px' }}>
          <select 
            style={{ ...styles.input, height: '34px', border: isInvalid ? '2px solid #ef4444' : '1px solid var(--border)', borderRadius: '6px', background: isInvalid ? '#fff5f5' : 'transparent' }}
            value={PAKISTAN_CITIES.includes(o[col.key]) ? o[col.key] : ""}
            onChange={e => handleUpdateOrder(o.id, col.key, e.target.value)}
          >
            {!PAKISTAN_CITIES.includes(o[col.key]) && <option value="">⚠️ {o[col.key]}</option>}
            {PAKISTAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>
      );
    }
    if (col.type === 'textarea') {
      return <textarea style={styles.textarea} value={o[col.key]} onChange={e => handleUpdateOrder(o.id, col.key, e.target.value)} />;
    }
    if (col.type === 'select') {
      return (
        <select style={styles.input} value={o[col.key]} onChange={e => handleUpdateOrder(o.id, col.key, e.target.value)}>
          {col.options.map(opt => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
        </select>
      );
    }
    if (col.type === 'checkbox') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px' }}>
          <input type="checkbox" checked={o[col.key]} onChange={e => handleUpdateOrder(o.id, col.key, e.target.checked)} />
        </div>
      );
    }
    return <input type={col.type} style={styles.input} value={o[col.key] || ''} onChange={e => handleUpdateOrder(o.id, col.key, e.target.value)} />;
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>📦 Shipment Bookings</h2>
      
      {/* EQUAL WIDTH CONTROL PANEL */}
      <div style={styles.controlPanel}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>SEARCH ORDERS</label>
            <input 
              type="text" placeholder="Search orders..." 
              style={styles.dropdown}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>COURIER SERVICE</label>
            <select 
              style={styles.dropdown}
              value={selectedCourier}
              onChange={e => {
                const courier = e.target.value;
                setSelectedCourier(courier);
                const acc = accounts.find(a => a.courier === courier && a.is_default) || accounts.find(a => a.courier === courier);
                if (acc) setSelectedAccount(acc.id);
              }}
            >
              <option value="tcs">TCS Courier</option>
              <option value="postex">PostEx</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>CONNECTED ACCOUNT</label>
            <select 
              style={styles.dropdown}
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
            >
              {filteredAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.is_default ? '[DEFAULT] ' : ''} {acc.username || acc.pickup_address_code || 'Acc ' + acc.id}
                </option>
              ))}
              {filteredAccounts.length === 0 && <option value="">No enabled accounts</option>}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6' }}>
            {selectedOrderIds.length} orders selected for {selectedCourier.toUpperCase()} booking
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button 
                style={{ ...styles.colBtn, borderColor: showColumnMenu ? 'var(--green)' : 'var(--border)', background: showColumnMenu ? 'rgba(0,230,118,0.05)' : 'var(--surface2)' }} 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
              >
                <span>⚙️ Columns</span>
                <span style={{ transform: showColumnMenu ? 'rotate(180deg)' : 'none', transition: '.3s' }}>▼</span>
              </button>
              
              {showColumnMenu && (
                <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '320px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {ALL_COLUMNS.map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => setVisibleColumns(prev => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key])} />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button 
              style={{ ...styles.btnPrimary, opacity: (selectedOrderIds.length === 0 || isBooking) ? 0.6 : 1, minWidth: '180px' }} 
              disabled={selectedOrderIds.length === 0 || isBooking}
              onClick={handleProcessBooking}
            >
              {isBooking ? 'Processing...' : '🚀 Generate Bookings'}
            </button>
          </div>
        </div>
      </div>

      {bulkStatus && (
        <div style={{ padding: '14px', background: 'rgba(0,230,118,0.1)', color: 'var(--green)', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(0,230,118,0.2)', fontSize: '14px', fontWeight: '700', textAlign: 'center' }}>
          ✨ Processing Order {bulkStatus.current} of {bulkStatus.total}...
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', marginBottom: '20px' }}>
          <h4 style={{ color: '#991b1b', marginTop: 0, marginBottom: '10px', fontSize: '14px' }}>⚠️ Booking Errors ({errors.length})</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#b91c1c' }}>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {loading ? <p>Syncing orders...</p> : (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '40px' }}>
                  <input type="checkbox" checked={filteredAndSortedOrders.length > 0 && filteredAndSortedOrders.every(o => selectedOrderIds.includes(o.id))} onChange={() => {
                    const currentIds = filteredAndSortedOrders.map(o => o.id);
                    const allSelected = currentIds.every(id => selectedOrderIds.includes(id));
                    setSelectedOrderIds(allSelected ? prev => prev.filter(id => !currentIds.includes(id)) : prev => [...new Set([...prev, ...currentIds])]);
                  }} />
                </th>
                {activeColumns.map(col => (
                  <th key={col.key} style={styles.th} onClick={() => setSortConfig({ key: col.key, direction: sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                    {col.label} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedOrders.map(o => (
                <tr key={o.id} style={{ background: selectedOrderIds.includes(o.id) ? 'rgba(59,130,246,0.02)' : 'transparent' }}>
                  <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle' }}>
                    <input type="checkbox" checked={selectedOrderIds.includes(o.id)} onChange={() => toggleSelectOrder(o.id)} />
                  </td>
                  {activeColumns.map(col => (
                    <td key={col.key} style={{ ...styles.td, width: col.key === 'address' ? '280px' : 'auto' }}>
                      {renderCell(o, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
