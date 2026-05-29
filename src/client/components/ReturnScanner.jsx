import React, { useState, useRef, useEffect } from 'react';

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  card: { background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' },
  scannerHeader: {
    background: 'linear-gradient(135deg, #312e81, #4338ca)',
    color: '#fff',
    padding: '16px 24px',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: '800',
    borderBottom: '1px solid var(--border)'
  },
  scannerBody: {
    background: 'var(--surface)',
    padding: '24px',
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
    border: '1px solid var(--border)',
    borderTop: 'none'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', background: 'var(--surface2)', fontSize: '12px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', width: '100%', outline: 'none', fontSize: '14px' },
  scanBtn: {
    padding: '12px 32px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    transition: '.2s',
    whiteSpace: 'nowrap'
  },
  pill: (bg, text) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100px',
    height: '64px',
    borderRadius: '10px',
    background: bg,
    color: text,
    fontWeight: '800',
    fontSize: '20px',
    lineHeight: '1.2',
    border: `1.5px solid ${text}33`
  }),
  pillLabel: {
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '900',
    opacity: 0.8
  }
};

export default function ReturnScanner({ shop }) {
  const [courier, setCourier] = useState('TCS');
  const [trackingInput, setTrackingInput] = useState('');
  const [scannedBookings, setScannedBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Counter states
  const [totalCount, setTotalCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleScanAction = async () => {
    const tracking = trackingInput.trim();
    if (!tracking) return;
    setTrackingInput('');
    setLoading(true);

    if (scannedBookings.some(b => b.tracking_number === tracking || b.order_id === tracking)) {
      setErrorCount(prev => prev + 1);
      alert('Booking already scanned!');
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`/api/returns/scan?shop=${shop}&courier=${courier}&tracking=${tracking}`);
      const data = await resp.json();

      if (data.success && data.booking) {
        setScannedBookings(prev => [data.booking, ...prev]);
        setSuccessCount(prev => prev + 1);
        setTotalCount(prev => prev + 1);
      } else {
        setErrorCount(prev => prev + 1);
        alert(data.error || 'Invalid tracking code or booking status');
      }
    } catch (err) {
      console.error(err);
      setErrorCount(prev => prev + 1);
      alert('Error searching for return booking');
    }
    setLoading(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleScanAction();
    }
  };

  const removeScan = (id) => {
    setScannedBookings(prev => prev.filter(b => b.id !== id));
    setTotalCount(prev => Math.max(0, prev - 1));
    setSuccessCount(prev => Math.max(0, prev - 1));
    if (inputRef.current) inputRef.current.focus();
  };

  const handleGenerateReturnSheet = async () => {
    if (scannedBookings.length === 0) return alert('No shipments scanned!');
    setGenerating(true);

    const bookingIds = scannedBookings.map(b => b.id);

    try {
      const resp = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, courier, bookingIds })
      });
      const data = await resp.json();

      if (data.success) {
        alert(`Return Sheet ${data.returnNumber} generated successfully!`);
        setScannedBookings([]);
        setTotalCount(0);
        setSuccessCount(0);
        setErrorCount(0);
      } else {
        alert(data.message || 'Error generating return sheet');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
    setGenerating(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px', color: 'var(--text)' }}>Add Return</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Scan tracking numbers to record return packages and generate return sheets.</p>
        </div>
      </div>

      <div style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)', borderRadius: '12px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={styles.scannerHeader}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="1" y="3" width="15" height="13" rx="2" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          Add Return
        </div>
        
        <div style={styles.scannerBody}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
              <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Courier</label>
              <select 
                value={courier} 
                onChange={e => {
                  setCourier(e.target.value);
                  setScannedBookings([]); 
                  setTotalCount(0);
                  setSuccessCount(0);
                  setErrorCount(0);
                  if (inputRef.current) inputRef.current.focus();
                }} 
                style={styles.input}
              >
                <option value="TCS">TCS</option>
                <option value="PostEx">PostEx</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '280px' }}>
              <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scan or type Tracking...</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="Click here and scan return package barcode..." 
                  value={trackingInput} 
                  onChange={e => setTrackingInput(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  style={{ ...styles.input, background: loading ? 'var(--surface2)' : 'var(--bg)' }}
                />
                <button 
                  onClick={handleScanAction}
                  style={styles.scanBtn}
                  disabled={loading}
                >
                  Scan
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={styles.pill('rgba(99,102,241,0.1)', '#6366f1')}>
              {totalCount}
              <div style={styles.pillLabel}>Total</div>
            </div>
            <div style={styles.pill('rgba(16,185,129,0.1)', '#10b981')}>
              {successCount}
              <div style={styles.pillLabel}>Success</div>
            </div>
            <div style={styles.pill('rgba(239,68,68,0.1)', '#ef4444')}>
              {errorCount}
              <div style={styles.pillLabel}>Errors</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>Scanned Shipments ({scannedBookings.length})</h3>
            <button 
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, var(--green), var(--green2))',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '13px'
              }}
              onClick={handleGenerateReturnSheet}
              disabled={generating || scannedBookings.length === 0}
            >
              {generating ? 'Generating...' : 'Generate Return Sheet'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}><input type="checkbox" defaultChecked /></th>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Order</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>City</th>
                  <th style={styles.th}>COD</th>
                  <th style={styles.th}>Tracking</th>
                </tr>
              </thead>
              <tbody>
                {scannedBookings.map((b, index) => (
                  <tr key={b.id}>
                    <td style={styles.td}><input type="checkbox" defaultChecked /></td>
                    <td style={styles.td}>{scannedBookings.length - index}</td>
                    <td style={styles.td}>{new Date(b.created_at || Date.now()).toLocaleDateString()}</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: '#10b981' }}>{b.order_id}</td>
                    <td style={styles.td}>{b.consignee_name}</td>
                    <td style={styles.td}>{b.consignee_phone}</td>
                    <td style={styles.td}>Shipped Address</td>
                    <td style={styles.td}>{b.consignee_city}</td>
                    <td style={styles.td}>Rs. {b.cod_amount || 0}</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: '#6366f1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>{b.tracking_number}</span>
                        <button 
                          onClick={() => removeScan(b.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          (Remove)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {scannedBookings.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ ...styles.td, textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
                          <path d="M3 5v14M6 5v14M9 5v14M12 5v14M15 5v14M18 5v14M21 5v14" />
                        </svg>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>Scan or type a tracking number to begin</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
