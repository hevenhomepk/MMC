import React, { useState, useRef, useEffect } from 'react';

const styles = {
  container: { padding: '24px', maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  card: { background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', background: 'var(--surface2)', fontSize: '12px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', width: '100%', outline: 'none' },
  btn: (type) => ({
    padding: '10px 20px',
    borderRadius: '8px',
    border: type === 'primary' ? 'none' : '1px solid var(--border)',
    background: type === 'primary' ? 'var(--green)' : 'var(--surface2)',
    color: type === 'primary' ? '#000' : 'var(--text)',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    transition: '.2s'
  })
};

export default function LoadsheetScanner({ shop }) {
  const [courier, setCourier] = useState('TCS');
  const [trackingInput, setTrackingInput] = useState('');
  const [scannedBookings, setScannedBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleScan = async (e) => {
    if (e.key === 'Enter' && trackingInput.trim() !== '') {
      const tracking = trackingInput.trim();
      setTrackingInput('');
      setLoading(true);

      if (scannedBookings.some(b => b.tracking_number === tracking || b.order_id === tracking)) {
        alert('Booking already scanned!');
        setLoading(false);
        return;
      }

      try {
        const resp = await fetch(`/api/bookings/scan?shop=${shop}&courier=${courier}&tracking=${tracking}`);
        const data = await resp.json();

        if (data.success && data.booking) {
          setScannedBookings(prev => [data.booking, ...prev]);
        } else {
          alert(data.error || 'Invalid scan');
        }
      } catch (err) {
        console.error(err);
        alert('Error scanning booking');
      }
      setLoading(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const removeScan = (id) => {
    setScannedBookings(prev => prev.filter(b => b.id !== id));
    if (inputRef.current) inputRef.current.focus();
  };

  const handleGenerate = async () => {
    if (scannedBookings.length === 0) return alert('No bookings scanned!');
    setGenerating(true);

    const bookingIds = scannedBookings.map(b => b.id);

    try {
      const resp = await fetch('/api/loadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, courier, bookingIds })
      });
      const data = await resp.json();

      if (data.success) {
        alert(`Loadsheet ${data.loadsheetNumber} generated successfully!`);
        setScannedBookings([]);
      } else {
        alert(data.message || 'Error generating loadsheet');
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
          <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px' }}>Loadsheet Scanner</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Scan bookings to generate a new loadsheet.</p>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>Select Courier</label>
            <select 
              value={courier} 
              onChange={e => {
                setCourier(e.target.value);
                setScannedBookings([]); // Clear scans if courier changes
                if (inputRef.current) inputRef.current.focus();
              }} 
              style={{ ...styles.input, width: '200px' }}
            >
              <option value="TCS">TCS</option>
              <option value="PostEx">PostEx</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>Scan Tracking or Order Number</label>
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Click here and scan barcode..." 
              value={trackingInput} 
              onChange={e => setTrackingInput(e.target.value)} 
              onKeyDown={handleScan}
              disabled={loading}
              style={{ ...styles.input, background: loading ? 'var(--surface2)' : 'var(--bg)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Scanned Shipments ({scannedBookings.length})</h3>
          <button 
            style={styles.btn('primary')} 
            onClick={handleGenerate}
            disabled={generating || scannedBookings.length === 0}
          >
            {generating ? 'Generating...' : 'Generate Loadsheet'}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}><input type="checkbox" /></th>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Order</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>City</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>COD</th>
                <th style={styles.th}>Courier</th>
                <th style={styles.th}>Tracking</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {scannedBookings.map((b, index) => (
                <tr key={b.id}>
                  <td style={styles.td}><input type="checkbox" /></td>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>{new Date(b.created_at || Date.now()).toLocaleDateString()}</td>
                  <td style={styles.td}>{b.order_id}</td>
                  <td style={styles.td}>{b.consignee_name}</td>
                  <td style={styles.td}>{b.consignee_phone}</td>
                  <td style={styles.td}>{b.consignee_city}</td>
                  <td style={styles.td}>-</td>
                  <td style={styles.td}>{b.cod_amount || 0}</td>
                  <td style={styles.td}>{b.courier}</td>
                  <td style={styles.td}>{b.tracking_number}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Pending</span>
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
                  <td colSpan="12" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No shipments scanned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
