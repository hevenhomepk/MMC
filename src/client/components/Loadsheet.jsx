// src/client/components/Loadsheet.jsx
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const styles = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  card: { background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', background: 'var(--surface2)', fontSize: '12px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  td: { padding: '14px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
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

export default function Loadsheet({ shop }) {
  const [loadsheets, setLoadsheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courier, setCourier] = useState('TCS');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    if (!fromDate) return alert('Please select a From date');
    setLoading(true);
    try {
      const resp = await fetch(`/api/loadsheets/fetch-remote?shop=${shop}&courier=${courier}&from=${fromDate}&to=${toDate}`);
      const data = await resp.json();
      if (data.success) {
        // TCS and PostEx might return different structures. Ensure it's an array.
        let records = [];
        if (Array.isArray(data.data)) {
          records = data.data;
        } else if (data.data && Array.isArray(data.data.loadsheets)) {
          records = data.data.loadsheets;
        } else if (data.data && typeof data.data === 'object') {
          records = [data.data]; // fallback
        }
        setLoadsheets(records);
      } else {
        alert('Error: ' + data.message);
        setLoadsheets([]);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to connect to API');
    }
    setLoading(false);
  };

  const handleExportExcel = () => {
    if (loadsheets.length === 0) return alert('No data to export.');
    const ws = XLSX.utils.json_to_sheet(loadsheets);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loadsheets");
    XLSX.writeFile(wb, `Loadsheets_${courier}_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Dynamically extract columns based on the first record
  const columns = loadsheets.length > 0 ? Object.keys(loadsheets[0]).filter(k => typeof loadsheets[0][k] !== 'object') : [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Remote Loadsheets</h1>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>Courier</label>
              <select value={courier} onChange={e => setCourier(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}>
                <option value="TCS">TCS</option>
                <option value="PostEx">PostEx</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '2px' }}>
              <button style={{ ...styles.btn('primary'), marginTop: 'auto' }} onClick={fetchData}>
                {loading ? 'Fetching...' : 'Fetch Data'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ ...styles.btn(), background: '#10b981', color: '#fff', border: 'none' }} onClick={handleExportExcel}>Download Excel</button>
            <button style={{ ...styles.btn(), background: '#3b82f6', color: '#fff', border: 'none' }} onClick={handlePrint}>Print PDF</button>
          </div>
        </div>

        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              #print-table-area, #print-table-area * { visibility: visible; }
              #print-table-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
            }
          `}
        </style>

        <div id="print-table-area" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} style={styles.th}>{col.replace(/_/g, ' ')}</th>
                ))}
                {columns.length === 0 && <th style={styles.th}>No data</th>}
              </tr>
            </thead>
            <tbody>
              {loadsheets.length > 0 ? loadsheets.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col} style={styles.td}>{String(row[col])}</td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    {loading ? 'Loading...' : 'No data fetched. Select courier and dates, then click Fetch.'}
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
