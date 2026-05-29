import React, { useState, useEffect } from 'react';

const styles = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  card: { background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', background: 'var(--surface2)', fontSize: '12px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
  badge: (status) => ({
    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
    background: status === 'Created' ? 'rgba(16,185,129,0.1)' : 'var(--surface2)',
    color: status === 'Created' ? '#10b981' : 'var(--muted)'
  }),
  btn: {
    padding: '8px 14px', borderRadius: '6px', background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'none'
  }
};

export default function LoadsheetLogs({ shop, courierFilter }) {
  const [loadsheets, setLoadsheets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoadsheets();
  }, [shop, courierFilter]);

  const fetchLoadsheets = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/loadsheets?shop=${shop}`);
      const data = await resp.json();
      if (data.success) {
        let list = data.loadsheets || [];
        if (courierFilter) {
          list = list.filter(ls => ls.courier.toLowerCase() === courierFilter.toLowerCase());
        }
        setLoadsheets(list);
      } else {
        console.error('Failed to fetch loadsheets:', data.message);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePrint = (lsId) => {
    window.open(`/api/loadsheets/${lsId}/print?shop=${encodeURIComponent(shop)}`, '_blank');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px' }}>
            {courierFilter ? `${courierFilter} Loadsheets` : 'All Loadsheets'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>History of all generated loadsheets.</p>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Courier</th>
                <th style={styles.th}>Shipments</th>
                <th style={styles.th}>Total Amount</th>
                <th style={styles.th}>Total COD</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadsheets.map((ls, index) => (
                <tr key={ls.id}>
                  <td style={styles.td}>{ls.loadsheet_number || (index + 1)}</td>
                  <td style={styles.td}>{new Date(ls.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 'bold' }}>{ls.courier}</span>
                  </td>
                  <td style={styles.td}>{ls.total_shipments}</td>
                  <td style={styles.td}>Rs. {ls.total_amount || 0}</td>
                  <td style={styles.td}>Rs. {ls.total_cod || 0}</td>
                  <td style={styles.td}>
                    <button style={styles.btn} onClick={() => handlePrint(ls.id)}>Print / View</button>
                  </td>
                </tr>
              ))}
              {!loading && loadsheets.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No loadsheets found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    Loading...
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
