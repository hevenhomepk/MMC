import React, { useState, useEffect } from 'react';

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' },
  th: { textAlign: 'left', padding: '14px 16px', background: '#1e293b', fontSize: '11px', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '14px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
  btn: (type) => ({
    padding: '6px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    border: type === 'print' ? '1px solid var(--green)' : '1px solid var(--border)',
    background: type === 'print' ? 'rgba(0, 230, 118, 0.05)' : 'var(--surface2)',
    color: type === 'print' ? 'var(--green)' : 'var(--text)',
    transition: '.2s',
    marginRight: '8px'
  })
};

export default function ReturnSheets({ shop }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReturnSheets = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/returns/sheets?shop=${shop}`);
        const data = await resp.json();
        if (data.success) {
          setSheets(data.returnSheets);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchReturnSheets();
  }, [shop]);

  const handlePrint = (sheetId) => {
    window.open(`/api/returns/sheets/${sheetId}/print?shop=${encodeURIComponent(shop)}`, '_blank');
  };

  const handleDownload = (sheet) => {
    // Generate a simple CSV download
    const headers = ['Order ID', 'Tracking Number', 'Consignee Name', 'City', 'COD Amount'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `return_sheet_${sheet.return_sheet_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px', color: 'var(--text)' }}>Return Sheet</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>View all created return sheets and manifest reports.</p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Courier</th>
              <th style={styles.th}>Shipments</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>COD</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  Loading Return Sheets...
                </td>
              </tr>
            ) : sheets.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  No return sheets found.
                </td>
              </tr>
            ) : (
              sheets.map((sheet, index) => (
                <tr key={sheet.id}>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>
                    {new Date(sheet.created_at).toLocaleDateString()} {new Date(sheet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{sheet.courier}</td>
                  <td style={styles.td}>{sheet.total_shipments}</td>
                  <td style={styles.td}>Rs {sheet.total_amount || 0}</td>
                  <td style={styles.td}>Rs {sheet.total_cod || 0}</td>
                  <td style={styles.td}>
                    <button 
                      onClick={() => handlePrint(sheet.id)}
                      style={styles.btn('print')}
                    >
                      Print
                    </button>
                    <button 
                      onClick={() => handleDownload(sheet)}
                      style={styles.btn('download')}
                    >
                      Download
                    </button>
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
