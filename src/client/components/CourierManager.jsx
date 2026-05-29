// src/client/components/CourierManager.jsx
import React from 'react';

const COURIERS = [
  { id: 'tcs', name: 'TCS Courier', icon: '📦', color: '#3b82f6' },
  { id: 'postex', name: 'PostEx', icon: '🚚', color: '#10b981' }
];

export default function CourierManager() {
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>🛡️ Courier Management</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>Select a courier to view booked orders and manage connected accounts.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {COURIERS.map(c => (
          <div 
            key={c.id}
            onClick={() => window.location.hash = `#history-${c.id}`}
            style={{ 
              background: 'var(--card)', 
              border: '1px solid var(--border)', 
              borderRadius: '16px', 
              padding: '24px', 
              cursor: 'pointer',
              transition: '.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              {c.icon}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>{c.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>View history & settings</div>
            </div>
            <button 
              style={{ 
                marginTop: '10px', 
                padding: '8px 16px', 
                borderRadius: '8px', 
                border: 'none', 
                background: c.color, 
                color: '#fff', 
                fontWeight: '700', 
                fontSize: '13px', 
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Open Dashboard
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
