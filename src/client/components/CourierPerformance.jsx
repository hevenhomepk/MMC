// src/client/components/CourierPerformance.jsx
import React, { useState, useEffect, useRef } from 'react';

const STATUSES_COURIER = ['Courier','Total','Booked','Loadsheet','Shipped','Assigned','Pending','Refused','Delivered','Returned','RTS','Cancelled'];
const MAJOR_CITIES = ['Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Peshawar', 'Multan', 'Hyderabad', 'Islamabad', 'Quetta', 'Bahawalpur', 'Sargodha', 'Sialkot', 'Sukkur', 'Larkana', 'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Dera Ghazi Khan', 'Gujrat'];
const STATUS_COLORS = {
  Booked:'#3b82f6', Loadsheet:'#f59e0b', Shipped:'#8b5cf6', Assigned:'#06b6d4',
  Pending:'#f97316', Refused:'#ef4444', Delivered:'#10b981', Returned:'#ec4899',
  RTS:'#a855f7', Cancelled:'#6b7280'
};

const styles = {
  page: { padding: '0', minHeight: '80vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' },
  filterCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' },
  filterTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: '16px' },
  filterGrid: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' },
  input: { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: '13px', outline: 'none', minWidth: '140px', height: '40px' },
  searchBtn: { padding: '0 24px', height: '40px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
  tableCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  tableTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' },
  downloadBtn: { padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '11px 14px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap', background: 'var(--surface2)' },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
  noData: { textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '14px' },
};

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

export default function CourierPerformance({ shop }) {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [courier, setCourier] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [orderNum, setOrderNum] = useState('');
  const [trackingNum, setTrackingNum] = useState('');

  const [courierPerf, setCourierPerf] = useState([]);
  const [cityPerf, setCityPerf] = useState([]);
  const [itemsPerf, setItemsPerf] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ shop, dateFrom, dateTo });
      if (courier) params.set('courier', courier);
      if (city) params.set('city', city);
      if (status) params.set('status', status);
      const resp = await fetch(`/api/analytics/performance?${params}`);
      const data = await resp.json();
      if (data.success) {
        setCourierPerf(data.courierPerformance || []);
        setCityPerf(data.cityPerformance || []);
        setItemsPerf(data.itemsPerformance || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statuses = ['Booked','Loadsheet','Shipped','Assigned','Pending','Refused','Delivered','Returned','RTS','Cancelled'];

  const downloadCourierPerf = () => {
    const headers = ['Courier','Total','Booked','Loadsheet','Shipped','Assigned','Pending','Refused','Delivered','Returned','RTS','Cancelled'];
    const rows = courierPerf.map(r => [r.courier, r.total, r.booked, r.loadsheet, r.shipped, r.assigned, r.pending, r.refused, r.delivered, r.returned, r.rts, r.cancelled]);
    downloadCSV(headers, rows, 'courier-performance.csv');
  };
  const downloadCityPerf = () => {
    const headers = ['City','Total','Delivered','Returned','RTS','Other','Best Courier'];
    const rows = cityPerf.map(r => [r.city, r.total, r.delivered, r.returned, r.rts, r.other, r.best_courier || '-']);
    downloadCSV(headers, rows, 'city-performance.csv');
  };
  const downloadItemsPerf = () => {
    const headers = ['Product','Qty','Delivered','Returned','RTS','Other','Amount'];
    const rows = itemsPerf.map(r => [r.product, r.qty, r.delivered, r.returned, r.rts, r.other, r.amount]);
    downloadCSV(headers, rows, 'items-performance.csv');
  };

  return (
    <div style={styles.page}>
      {/* Search Filter */}
      <div style={styles.filterCard}>
        <div style={styles.filterTitle}>
          <span>▼</span> SEARCH FILTER
        </div>
        <div style={styles.filterGrid}>
          <div style={styles.fieldWrap}>
            <div style={styles.label}>DATE RANGE</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="date" style={styles.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>–</span>
              <input type="date" style={styles.input} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div style={styles.fieldWrap}>
            <div style={styles.label}>ORDER #</div>
            <input type="text" placeholder="Search order" style={styles.input} value={orderNum} onChange={e => setOrderNum(e.target.value)} />
          </div>
          <div style={styles.fieldWrap}>
            <div style={styles.label}>TRACKING #</div>
            <input type="text" placeholder="Search tracking" style={styles.input} value={trackingNum} onChange={e => setTrackingNum(e.target.value)} />
          </div>
          <div style={styles.fieldWrap}>
            <div style={styles.label}>COURIER</div>
            <select style={styles.input} value={courier} onChange={e => setCourier(e.target.value)}>
              <option value="">All Couriers</option>
              <option value="TCS">TCS</option>
              <option value="PostEx">PostEx</option>
            </select>
          </div>
          <div style={styles.fieldWrap}>
            <div style={styles.label}>CITY</div>
            <select style={styles.input} value={city} onChange={e => setCity(e.target.value)}>
              <option value="">All Cities</option>
              {MAJOR_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={styles.fieldWrap}>
            <div style={styles.label}>STATUS</div>
            <select style={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button style={styles.searchBtn} onClick={fetchData} disabled={loading}>
              {loading ? 'Loading...' : 'Search'}
            </button>
            <button
              style={{ ...styles.searchBtn, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >Guide</button>
          </div>
        </div>
      </div>

      {/* COURIERS PERFORMANCE */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={styles.tableTitle}>
            <span>⊞</span> COURIERS PERFORMANCE
          </div>
          <button style={styles.downloadBtn} onClick={downloadCourierPerf}>Download</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['COURIER','TOTAL','BOOKED','LOADSHEET','SHIPPED','ASSIGNED','PENDING','REFUSED','DELIVERED','RETURNED','RTS','CANCELLED'].map((h, i) => (
                  <th key={h} style={{ ...styles.th, color: i === 0 ? 'var(--muted)' : (STATUS_COLORS[h.charAt(0)+h.slice(1).toLowerCase()] || 'var(--muted)') }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courierPerf.length === 0 ? (
                <tr><td colSpan={12} style={styles.noData}>No data</td></tr>
              ) : courierPerf.map(r => (
                <tr key={r.courier}>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{r.courier}</td>
                  <td style={styles.td}>{r.total}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Booked }}>{r.booked}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Loadsheet }}>{r.loadsheet}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Shipped }}>{r.shipped}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Assigned }}>{r.assigned}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Pending }}>{r.pending}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Refused }}>{r.refused}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Delivered }}>{r.delivered}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Returned }}>{r.returned}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.RTS }}>{r.rts}</td>
                  <td style={{ ...styles.td, color: STATUS_COLORS.Cancelled }}>{r.cancelled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CITY PERFORMANCE */}
      <div style={{ ...styles.tableCard, maxWidth: '780px', margin: '0 auto 20px' }}>
        <div style={styles.tableHeader}>
          <div style={styles.tableTitle}>
            <span>📍</span> CITY PERFORMANCE (TOP 50)
          </div>
          <button style={styles.downloadBtn} onClick={downloadCityPerf}>Download</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[['CITY','var(--muted)'],['TOTAL','var(--muted)'],['DELIVERED','#10b981'],['RETURNED','#ec4899'],['RTS','#a855f7'],['OTHER','#f97316'],['BEST COURIER','#3b82f6']].map(([h, c]) => (
                  <th key={h} style={{ ...styles.th, color: c }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cityPerf.length === 0 ? (
                <tr><td colSpan={7} style={styles.noData}>No data</td></tr>
              ) : cityPerf.map(r => (
                <tr key={r.city}>
                  <td style={styles.td}>{r.city}</td>
                  <td style={styles.td}>{r.total}</td>
                  <td style={{ ...styles.td, color: '#10b981' }}>{r.delivered}</td>
                  <td style={{ ...styles.td, color: '#ec4899' }}>{r.returned}</td>
                  <td style={{ ...styles.td, color: '#a855f7' }}>{r.rts}</td>
                  <td style={{ ...styles.td, color: '#f97316' }}>{r.other}</td>
                  <td style={{ ...styles.td, color: '#3b82f6', fontWeight: '700' }}>{r.best_courier || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ITEMS PERFORMANCE */}
      <div style={{ ...styles.tableCard, maxWidth: '780px', margin: '0 auto 20px' }}>
        <div style={styles.tableHeader}>
          <div style={styles.tableTitle}>
            <span>📦</span> ITEMS PERFORMANCE (TOP 100)
          </div>
          <button style={styles.downloadBtn} onClick={downloadItemsPerf}>Download</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[['PRODUCT','var(--muted)'],['QTY','var(--muted)'],['DELIVERED','#10b981'],['RETURNED','#ec4899'],['RTS','#a855f7'],['OTHER','#f97316'],['AMOUNT','var(--text)']].map(([h, c]) => (
                  <th key={h} style={{ ...styles.th, color: c }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsPerf.length === 0 ? (
                <tr><td colSpan={7} style={styles.noData}>No data</td></tr>
              ) : itemsPerf.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...styles.td, fontWeight: '600' }}>{r.product}</td>
                  <td style={styles.td}>{r.qty}</td>
                  <td style={{ ...styles.td, color: '#10b981' }}>{r.delivered}</td>
                  <td style={{ ...styles.td, color: '#ec4899' }}>{r.returned}</td>
                  <td style={{ ...styles.td, color: '#a855f7' }}>{r.rts}</td>
                  <td style={{ ...styles.td, color: '#f97316' }}>{r.other}</td>
                  <td style={styles.td}>Rs. {parseFloat(r.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
