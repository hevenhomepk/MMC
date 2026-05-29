// src/client/components/TcsAccountList.jsx
import React, { useState, useEffect } from 'react';
import TcsAccountForm, { Toggle } from './TcsAccountForm';

export default function TcsAccountList({ shop }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/tcs/accounts?shop=${shop}`);
      const data = await resp.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (e) {
      console.error('Error fetching accounts', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [shop]);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    // Optimistic update
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, is_enabled: newStatus } : a));
    
    try {
      const resp = await fetch(`/api/tcs/accounts/${id}/toggle?shop=${shop}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: newStatus })
      });
      const data = await resp.json();
      if (!data.success) {
        // Revert on failure
        alert('Failed to toggle status: ' + data.error);
        fetchAccounts();
      }
    } catch (e) {
      console.error(e);
      alert('Error toggling status');
      fetchAccounts();
    }
  };

  if (isAdding || editingAccount) {
    return (
      <TcsAccountForm 
        shop={shop} 
        initialData={editingAccount}
        onCancel={() => {
          setIsAdding(false);
          setEditingAccount(null);
        }} 
        onSave={() => {
          setIsAdding(false);
          setEditingAccount(null);
          fetchAccounts();
        }} 
      />
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>
          📦 Connected TCS Accounts
        </h2>
        <button 
          onClick={() => setIsAdding(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + Add New Account
        </button>
      </div>

      {loading ? (
        <p>Loading accounts...</p>
      ) : accounts.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>No TCS accounts connected yet.</p>
          <button 
            onClick={() => setIsAdding(true)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #3b82f6', color: '#3b82f6', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}
          >
            Add your first account
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {accounts.map(acc => (
            <div key={acc.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              padding: '20px', background: 'var(--surface)', borderRadius: '12px', 
              border: acc.is_default ? '2px solid #3b82f6' : '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              opacity: acc.is_enabled ? 1 : 0.6
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>{acc.username}</h3>
                  {acc.is_default && <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Default</span>}
                  {!acc.is_enabled && <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Disabled</span>}
                </div>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>Account: {acc.account_number} • Cost Center: {acc.pickup_address || 'None'}</p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <Toggle 
                  label="" 
                  checked={acc.is_enabled} 
                  onChange={() => toggleStatus(acc.id, acc.is_enabled)} 
                  hideText
                />
                
                <button 
                  onClick={() => setEditingAccount(acc)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
