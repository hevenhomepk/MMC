// src/client/components/CourierCalendar.jsx
import React, { useState, useEffect, useRef } from 'react';

const COL_STATUSES = ['Booked','Loadsheet','Shipped','Assigned','Pending','Refused','Delivered','Returned','RTS','Cancelled'];
const MAJOR_CITIES = ['Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Peshawar', 'Multan', 'Hyderabad', 'Islamabad', 'Quetta', 'Bahawalpur', 'Sargodha', 'Sialkot', 'Sukkur', 'Larkana', 'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Dera Ghazi Khan', 'Gujrat'];

const styles = {
  page: { padding: '0', minHeight: '80vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' },
  hero: { textAlign: 'center', padding: '32px 24px 24px', borderBottom: '1px solid var(--border)', marginBottom: '24px' },
  heroTitle: { fontSize: '28px', fontWeight: '800', marginBottom: '8px' },
  heroSub: { fontSize: '14px', color: 'var(--muted)' },
  filterBar: { display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' },
  input: { padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px', outline: 'none', height: '42px' },
  btn: (variant) => ({
    padding: '0 20px', height: '42px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
    background: variant === 'primary' ? '#16a34a' : 'var(--surface)',
    color: variant === 'primary' ? '#fff' : variant === 'outline-green' ? '#16a34a' : 'var(--text)',
    border: variant === 'primary' ? 'none' : '1px solid var(--border)',
  }),
  tableWrap: { overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '11px 14px', background: 'var(--surface)', fontWeight: '700', borderBottom: '2px solid var(--border)', textAlign: 'center', fontSize: '13px', whiteSpace: 'nowrap' },
  thDate: { padding: '11px 14px', background: 'var(--surface)', fontWeight: '700', borderBottom: '2px solid var(--border)', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'center' },
  tdDate: { padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'left', fontWeight: '500' },
  tdTotal: { padding: '10px 14px', fontWeight: '700', textAlign: 'center', borderTop: '2px solid var(--border)' },
  tdTotalDate: { padding: '10px 14px', fontWeight: '700', textAlign: 'left', borderTop: '2px solid var(--border)' },
};

// Reuse the same DateRangePicker from CourierReport
function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('This Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [leftMonth, setLeftMonth] = useState(new Date());
  const [selecting, setSelecting] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const ref = useRef();

  const QUICK = ['Today', 'Yesterday', 'This Month', 'Last Month', 'Last 90 Days', 'Custom Range'];

  const applyQuick = (q) => {
    const today = new Date();
    let from, to;
    if (q === 'Today') { from = to = today; }
    else if (q === 'Yesterday') { const y = new Date(today); y.setDate(y.getDate()-1); from = to = y; }
    else if (q === 'This Month') { from = new Date(today.getFullYear(), today.getMonth(), 1); to = new Date(today.getFullYear(), today.getMonth()+1, 0); }
    else if (q === 'Last Month') { from = new Date(today.getFullYear(), today.getMonth()-1, 1); to = new Date(today.getFullYear(), today.getMonth(), 0); }
    else if (q === 'Last 90 Days') { from = new Date(today); from.setDate(from.getDate()-89); to = today; }
    else { setMode(q); return; }
    setMode(q);
    const fmt = d => d.toISOString().slice(0,10);
    setCustomFrom(fmt(from)); setCustomTo(fmt(to));
    onChange(fmt(from), fmt(to));
  };

  const handleApply = () => {
    if (customFrom && customTo) { onChange(customFrom, customTo); setOpen(false); }
  };

  const renderCal = (baseDate) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const years = Array.from({length:10}, (_,i)=> year-3+i);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells = [];
    for (let i=0; i<firstDay; i++) cells.push(null);
    for (let d=1; d<=daysInMonth; d++) cells.push(new Date(year,month,d));

    const fmt = d => d ? d.toISOString().slice(0,10) : '';
    const inRange = (d) => {
      if (!d || !customFrom) return false;
      const to = customTo || hoverDate;
      if (!to) return false;
      return fmt(d) > customFrom && fmt(d) < to;
    };
    const isStart = d => d && fmt(d) === customFrom;
    const isEnd = d => d && customTo && fmt(d) === customTo;

    const handleDayClick = (d) => {
      if (!d) return;
      const dStr = fmt(d);
      if (!customFrom || (customFrom && customTo)) { setCustomFrom(dStr); setCustomTo(''); setSelecting('to'); }
      else if (selecting === 'to') {
        if (dStr < customFrom) { setCustomTo(customFrom); setCustomFrom(dStr); }
        else setCustomTo(dStr);
        setSelecting(null);
      }
    };

    return (
      <div style={{ minWidth: '220px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', gap:'4px' }}>
          <select value={months[month]} onChange={e => { const nb = new Date(baseDate); nb.setMonth(months.indexOf(e.target.value)); baseDate === leftMonth ? setLeftMonth(nb) : setLeftMonth(new Date(nb.getFullYear(), nb.getMonth()-1, 1)); }} style={{ border:'1px solid var(--border)', borderRadius:'6px', padding:'4px 6px', fontSize:'12px', background:'var(--surface)', color:'var(--text)' }}>
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={year} onChange={e => { const nb = new Date(baseDate); nb.setFullYear(parseInt(e.target.value)); baseDate === leftMonth ? setLeftMonth(nb) : setLeftMonth(new Date(nb.getFullYear(), nb.getMonth()-1, 1)); }} style={{ border:'1px solid var(--border)', borderRadius:'6px', padding:'4px 6px', fontSize:'12px', background:'var(--surface)', color:'var(--text)' }}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', textAlign:'center' }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ fontSize:'11px', fontWeight:'700', color:'var(--muted)', padding:'4px 0' }}>{d}</div>)}
          {cells.map((d,i) => {
            const selected = isStart(d) || isEnd(d);
            const inR = inRange(d);
            return (
              <div key={i} onClick={() => handleDayClick(d)}
                onMouseEnter={() => { if (d && selecting==='to') setHoverDate(fmt(d)); }}
                style={{
                  padding:'5px 2px', borderRadius:'50%', cursor: d?'pointer':'default', fontSize:'12px',
                  background: selected ? '#3b82f6' : inR ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: selected ? '#fff' : d ? 'var(--text)' : 'transparent',
                  fontWeight: selected ? '700' : '400',
                }}>
                {d ? d.getDate() : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth()+1, 1);
  const displayVal = customFrom && customTo ? `${customFrom} - ${customTo}` : value || 'Select date range';

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(!open)} style={{ ...styles.input, cursor:'pointer', minWidth:'210px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', userSelect:'none' }}>
        <span style={{ fontSize: '13px' }}>{displayVal}</span>
        <span style={{ fontSize:'10px', color:'var(--muted)' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position:'fixed', zIndex:99999, background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'12px', boxShadow:'0 20px 50px rgba(0,0,0,0.25)', padding:'16px', display:'flex', gap:'0'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ borderRight:'1px solid var(--border)', paddingRight:'16px', marginRight:'16px', minWidth:'130px' }}>
            {QUICK.map(q => (
              <div key={q} onClick={() => applyQuick(q)} style={{
                padding:'8px 12px', borderRadius:'6px', fontSize:'13px', cursor:'pointer',
                background: mode===q ? '#3b82f6' : 'transparent', color: mode===q ? '#fff' : 'var(--text)',
                fontWeight: mode===q ? '700' : '400', marginBottom:'2px'
              }}>{q}</div>
            ))}
          </div>
          <div>
            <div style={{ display:'flex', gap:'24px', marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ cursor:'pointer', fontSize:'16px', color:'var(--muted)' }} onClick={() => setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth()-1,1))}>‹</span>
                {renderCal(leftMonth)}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {renderCal(rightMonth)}
                <span style={{ cursor:'pointer', fontSize:'16px', color:'var(--muted)' }} onClick={() => setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth()+1,1))}>›</span>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:'10px' }}>
              <span style={{ fontSize:'13px', color:'var(--muted)' }}>{customFrom && customTo ? `${customFrom} - ${customTo}` : ''}</span>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => { setCustomFrom(''); setCustomTo(''); }} style={{ padding:'6px 14px', borderRadius:'6px', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>Clear</button>
                <button onClick={handleApply} style={{ padding:'6px 14px', borderRadius:'6px', border:'none', background:'#3b82f6', color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:'700' }}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

export default function CourierCalendar({ shop }) {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,'0')}`;

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [courier, setCourier] = useState('');
  const [city, setCity] = useState('');
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ shop, dateFrom, dateTo });
      if (courier) params.set('courier', courier);
      if (city) params.set('city', city);
      const resp = await fetch(`/api/analytics/calendar?${params}`);
      const data = await resp.json();
      if (data.success) setDays(data.days || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDateChange = (from, to) => { setDateFrom(from); setDateTo(to); };

  // Compute totals
  const totals = COL_STATUSES.reduce((acc, s) => {
    acc[s] = days.reduce((sum, d) => sum + (parseInt(d[s]) || 0), 0);
    return acc;
  }, {});
  const grandTotal = COL_STATUSES.reduce((sum, s) => sum + totals[s], 0);

  const handleDownload = () => {
    const headers = ['Date', ...COL_STATUSES];
    const rows = days.map(d => [d.date, ...COL_STATUSES.map(s => d[s] || 0)]);
    rows.push(['Total = ' + grandTotal, ...COL_STATUSES.map(s => totals[s])]);
    downloadCSV(headers, rows, 'courier-calendar.csv');
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTitle}>Courier Calendar</div>
        <div style={styles.heroSub}>Detailed shipment logs with a calendar view to help manage parcels efficiently.</div>
      </div>

      <div style={styles.filterBar}>
        <DateRangePicker value={`${dateFrom} - ${dateTo}`} onChange={handleDateChange} />
        <select style={{ ...styles.input, minWidth: '150px' }} value={courier} onChange={e => setCourier(e.target.value)}>
          <option value="">All Couriers</option>
          <option value="TCS">TCS</option>
          <option value="PostEx">PostEx</option>
        </select>
        <select style={{ ...styles.input, minWidth: '150px' }} value={city} onChange={e => setCity(e.target.value)}>
          <option value="">All Cities</option>
          {MAJOR_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button style={styles.btn('primary')} onClick={fetchData} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        <button style={{ ...styles.btn('outline'), color: '#16a34a', border: '1px solid #16a34a' }} onClick={handleDownload}>Download</button>
        <button style={styles.btn('outline')}>Guide</button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thDate}>Date</th>
              {COL_STATUSES.map(s => <th key={s} style={styles.th}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.length === 0 && !loading ? (
              <tr><td colSpan={COL_STATUSES.length+1} style={{ textAlign:'center', padding:'40px', color:'var(--muted)' }}>No data</td></tr>
            ) : days.map((d, i) => (
              <tr key={d.date} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                <td style={styles.tdDate}>{d.date}</td>
                {COL_STATUSES.map(s => (
                  <td key={s} style={styles.td}>
                    {d[s] ? <span style={{ fontWeight: '600' }}>{d[s]}</span> : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {days.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--surface2)' }}>
                <td style={styles.tdTotalDate}>Total = {grandTotal}</td>
                {COL_STATUSES.map(s => (
                  <td key={s} style={styles.tdTotal}>{totals[s] || 0}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
