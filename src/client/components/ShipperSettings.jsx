// src/client/components/ShipperSettings.jsx
import React, { useState } from 'react';

const styles = {
  page: { padding: '24px', minHeight: '80vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'flex-start' },
  leftPanel: { flex: '0 0 300px' },
  rightPanel: { flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '24px' },
  title: { fontSize: '28px', fontWeight: '800', marginBottom: '8px' },
  subtitle: { fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.5' },
  videoBtn: { width: '100%', padding: '10px 0', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' },
  cardHeader: { padding: '12px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  cardBody: { padding: '20px' },
  
  flexRow: { display: 'flex', gap: '20px' },
  flexCol: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 },
  
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: 'var(--muted)', fontWeight: '500' },
  input: { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--text)', fontSize: '14px', outline: 'none' },
  
  toggleRow: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  toggleSwitch: { position: 'relative', width: '40px', height: '24px', background: '#3b82f6', borderRadius: '12px', cursor: 'pointer', flexShrink: 0 },
  toggleKnob: { position: 'absolute', top: '2px', left: '18px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%' },
  toggleText: { fontSize: '14px', fontWeight: '500' },
  toggleSub: { fontSize: '12px', color: 'var(--muted)', marginTop: '4px' },
  
  profileRow: { display: 'flex', gap: '12px' },
  saveBtn: { padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: 'fit-content' }
};

export default function ShipperSettings({ shop }) {
  const [profiles, setProfiles] = useState([
    { name: '', phone: '', city: '', address: '' },
    { name: '', phone: '', city: '', address: '' },
    { name: '', phone: '', city: '', address: '' }
  ]);

  const handleProfileChange = (index, field, value) => {
    const newProfiles = [...profiles];
    newProfiles[index][field] = value;
    setProfiles(newProfiles);
  };

  return (
    <div style={styles.page}>
      <div style={styles.leftPanel}>
        <div style={styles.title}>Shipper Settings</div>
        <div style={styles.subtitle}>Customize shipper profiles, notifications and label settings. For support WhatsApp: +923334291329</div>
        <button style={styles.videoBtn}>Video Guide</button>
      </div>
      
      <div style={styles.rightPanel}>
        
        <div style={styles.flexRow}>
          {/* Notifications Card */}
          <div style={{ ...styles.card, flex: 1 }}>
            <div style={styles.cardHeader}>
              <span style={{ fontSize: '16px' }}>🔔</span> Notifications
            </div>
            <div style={styles.cardBody}>
              <div style={styles.flexCol}>
                <div style={styles.toggleRow}>
                  <div style={styles.toggleSwitch}><div style={styles.toggleKnob}></div></div>
                  <div>
                    <div style={styles.toggleText}>Auto Courier Tracking</div>
                    <div style={styles.toggleSub}>Fetch live shipment tracking & update in Shopify</div>
                  </div>
                </div>
                <div style={styles.toggleRow}>
                  <div style={styles.toggleSwitch}><div style={styles.toggleKnob}></div></div>
                  <div>
                    <div style={styles.toggleText}>Send Delivery Updates to customers</div>
                    <div style={styles.toggleSub}>Email can be configured from Shopify Settings -&gt; Notification<br/>For Branded SMS / WhatsApp Official API contact: +923334291329</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* WhatsApp Messages Card */}
          <div style={{ ...styles.card, flex: 1 }}>
            <div style={styles.cardHeader}>
              <span style={{ fontSize: '16px' }}>💬</span> WhatsApp Messages
            </div>
            <div style={styles.cardBody}>
              <div style={styles.flexCol}>
                <div style={styles.inputGroup}>
                  <div style={styles.label}>Page: Courier Logs</div>
                  <input style={styles.input} defaultValue="Dear *[customer_name]* - [customer_phone], your order #[ord" />
                </div>
                <div style={styles.inputGroup}>
                  <div style={styles.label}>Page: Add Booking</div>
                  <input style={styles.input} defaultValue="Dear *[customer_name]* - [customer_phone], your order #[ord" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Label Settings Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ fontSize: '16px' }}>📦</span> Label Settings
          </div>
          <div style={styles.cardBody}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <div style={styles.label}>Website</div>
                <input style={styles.input} defaultValue={shop || "codorders.myshopify.com"} />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <div style={styles.label}>Logo Link (300x100px)</div>
                <input style={styles.input} />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <div style={styles.label}>Label Size</div>
                <select style={styles.input} defaultValue="A4 Standard - 3 Per Page">
                  <option value="A4 Standard - 3 Per Page">A4 Standard - 3 Per Page</option>
                  <option value="A4 - 4 Per Page">A4 - 4 Per Page</option>
                  <option value="Thermal - 4x6">Thermal - 4x6</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Shipper Profiles Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ fontSize: '16px' }}>📋</span> Shipper Profiles
          </div>
          <div style={styles.cardBody}>
            <div style={styles.flexCol}>
              {profiles.map((profile, i) => (
                <div key={i} style={styles.profileRow}>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    {i === 0 && <div style={styles.label}>Name</div>}
                    <input style={styles.input} placeholder={`Profile #${i + 1}`} value={profile.name} onChange={e => handleProfileChange(i, 'name', e.target.value)} />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    {i === 0 && <div style={styles.label}>Phone</div>}
                    <input style={styles.input} value={profile.phone} onChange={e => handleProfileChange(i, 'phone', e.target.value)} />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 1 }}>
                    {i === 0 && <div style={styles.label}>City</div>}
                    <input style={styles.input} value={profile.city} onChange={e => handleProfileChange(i, 'city', e.target.value)} />
                  </div>
                  <div style={{ ...styles.inputGroup, flex: 2 }}>
                    {i === 0 && <div style={styles.label}>Address</div>}
                    <input style={styles.input} value={profile.address} onChange={e => handleProfileChange(i, 'address', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button style={styles.saveBtn} onClick={() => alert('Settings Saved')}>Save Settings</button>
      </div>
    </div>
  );
}
