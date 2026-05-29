// src/client/components/AddBooking.jsx
import React, { useState, useEffect } from 'react';

const COURIER_CONFIG = {
  tcs: { name: 'TCS', icon: '📦', color: '#ef4444', bgColor: 'rgba(220,38,38,.15)' },
  postex: { name: 'PostEx', icon: '💰', color: '#00e676', bgColor: 'rgba(0,230,118,.12)' }
};

const styles = {
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    color: 'var(--muted)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px'
  },
  courierCard: (isSelected, config) => ({
    padding: '16px',
    borderRadius: '12px',
    border: isSelected ? `2px solid ${config.color}` : '1px solid var(--border)',
    background: isSelected ? config.bgColor : 'var(--surface)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    transition: '0.2s',
    flex: 1,
    minWidth: '120px'
  })
};

export default function AddBooking({ shop, initialOrders = [] }) {
  const [allAccounts, setAllAccounts] = useState([]);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Single Order State (used if initialOrders.length === 1 or 0)
  const [consigneeName, setConsigneeName] = useState(initialOrders[0]?.customer_name || '');
  const [consigneePhone, setConsigneePhone] = useState(initialOrders[0]?.phone || '');
  const [consigneeEmail, setConsigneeEmail] = useState(initialOrders[0]?.email || '');
  const [consigneeCity, setConsigneeCity] = useState(initialOrders[0]?.city || '');
  const [consigneeAddress, setConsigneeAddress] = useState(initialOrders[0]?.address || '');
  
  const [orderId, setOrderId] = useState(initialOrders[0]?.order_number || '');
  const [productDesc, setProductDesc] = useState(initialOrders[0]?.line_items || '');
  const [pieces, setPieces] = useState('1');
  const [weight, setWeight] = useState('');
  const [codAmount, setCodAmount] = useState(initialOrders[0]?.total_price || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [bulkStatus, setBulkStatus] = useState(null); // { current, total }

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const [tcsResp, postexResp] = await Promise.all([
          fetch(`/api/tcs/accounts?shop=${shop}`),
          fetch(`/api/postex/accounts?shop=${shop}`)
        ]);
        
        const tcsData = await tcsResp.json();
        const postexData = await postexResp.json();
        
        let accounts = [];
        if (tcsData.success) {
          accounts = [...accounts, ...tcsData.accounts.filter(a => a.is_enabled).map(a => ({ ...a, courier: 'tcs' }))];
        }
        if (postexData.success) {
          accounts = [...accounts, ...postexData.accounts.filter(a => a.is_enabled).map(a => ({ ...a, courier: 'postex' }))];
        }
        
        setAllAccounts(accounts);
        
        const couriers = [...new Set(accounts.map(a => a.courier))];
        setAvailableCouriers(couriers);
        
        if (accounts.length > 0) {
          const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
          setSelectedCourier(defaultAcc.courier);
          setSelectedAccount(defaultAcc.id);
          setWeight(defaultAcc.default_weight || '0.5');
        }
      } catch (e) {
        console.error('Error fetching accounts', e);
      }
      setLoading(false);
    };
    fetchAccounts();
  }, [shop]);

  const filteredAccounts = allAccounts
    .filter(a => a.courier === selectedCourier)
    .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

  const handleCourierSelect = (courierId) => {
    setSelectedCourier(courierId);
    const courierAccounts = allAccounts
      .filter(a => a.courier === courierId)
      .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    
    if (courierAccounts.length > 0) {
      setSelectedAccount(courierAccounts[0].id);
      setWeight(courierAccounts[0].default_weight || '0.5');
    } else {
      setSelectedAccount('');
    }
  };

  const handleAccountChange = (e) => {
    const id = e.target.value;
    setSelectedAccount(id);
    const acc = filteredAccounts.find(a => String(a.id) === String(id));
    if (acc) {
      setWeight(acc.default_weight || '0.5');
    }
  };

  const processBooking = async (details) => {
    const endpoint = selectedCourier === 'tcs' ? '/api/tcs/book' : '/api/postex/book';
    const payload = {
      shop,
      accountId: selectedAccount,
      bookingDetails: details
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await resp.json();
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedAccount) {
      alert("Please select a courier account first.");
      return;
    }
    
    setIsSubmitting(true);
    setBookingResult(null);

    try {
      if (initialOrders.length > 1) {
        // Bulk Process
        let successCount = 0;
        for (let i = 0; i < initialOrders.length; i++) {
          setBulkStatus({ current: i + 1, total: initialOrders.length });
          const order = initialOrders[i];
          const result = await processBooking({
            consigneeName: order.customer_name,
            consigneePhone: order.phone,
            consigneeEmail: order.email,
            consigneeCity: order.city,
            consigneeAddress: order.address,
            orderId: order.order_number,
            productDesc: order.line_items,
            pieces: '1',
            weight: weight,
            codAmount: order.total_price
          });
          if (result.success) successCount++;
        }
        setBookingResult({ success: true, message: `Successfully processed ${successCount} out of ${initialOrders.length} orders.` });
      } else {
        // Single Process
        const result = await processBooking({
          consigneeName, consigneePhone, consigneeEmail, consigneeCity, consigneeAddress,
          orderId, productDesc, pieces, weight, codAmount
        });
        
        if (result.success) {
          setBookingResult({ success: true, trackingNumber: result.result.trackingNumber });
          if (initialOrders.length === 0) {
            setConsigneeName(''); setConsigneePhone(''); setConsigneeCity(''); setConsigneeAddress('');
            setOrderId(''); setProductDesc(''); setCodAmount('');
          }
        } else {
          setBookingResult({ success: false, error: result.error });
        }
      }
    } catch (err) {
      console.error(err);
      setBookingResult({ success: false, error: "Network error occurred." });
    }
    setIsSubmitting(false);
    setBulkStatus(null);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: "'Inter', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', marginBottom: '24px' }}>
        {initialOrders.length > 1 ? `📦 Bulk Booking (${initialOrders.length} Orders)` : '➕ Add New Booking'}
      </h2>

      {bookingResult?.success && (
        <div style={{ padding: '20px', background: '#dcfce7', color: '#166534', borderRadius: '12px', marginBottom: '24px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>✅ {initialOrders.length > 1 ? 'Bulk Processing Complete' : 'Booking Generated!'}</h3>
          <p style={{ margin: '8px 0 0' }}>{bookingResult.message || 'Your shipment has been successfully created.'}</p>
          {bookingResult.trackingNumber && <p style={{ margin: '8px 0 0', fontWeight: '700', fontSize: '18px' }}>Tracking Number: {bookingResult.trackingNumber}</p>}
        </div>
      )}

      {bulkStatus && (
        <div style={{ padding: '16px', background: 'var(--surface2)', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontWeight: '600' }}>Processing Order {bulkStatus.current} of {bulkStatus.total}...</p>
          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${(bulkStatus.current / bulkStatus.total) * 100}%`, height: '100%', background: '#00e676', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '24px' }}>
        
        {/* Step 1: Courier Selection */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#3b82f6', fontSize: '16px' }}>1. Select Courier</h4>
          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading couriers...</p>
          ) : availableCouriers.length === 0 ? (
            <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontWeight: '500' }}>
              No courier accounts connected. Please go to Courier Settings to connect an account first.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {availableCouriers.map(id => {
                const config = COURIER_CONFIG[id];
                return (
                  <div 
                    key={id} 
                    style={styles.courierCard(selectedCourier === id, config)}
                    onClick={() => handleCourierSelect(id)}
                  >
                    <span style={{ fontSize: '24px' }}>{config.icon}</span>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>{config.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedCourier && (
          <form onSubmit={handleBooking}>
            {/* Step 2: Account Selection */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#3b82f6', fontSize: '16px' }}>2. Select {COURIER_CONFIG[selectedCourier].name} Account</h4>
              <select 
                value={selectedAccount} 
                onChange={handleAccountChange}
                style={styles.input}
                required
              >
                {filteredAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.is_default ? '[DEFAULT] ' : ''} {acc.username || acc.pickup_address_code || 'Unnamed Account'} ({acc.account_number || 'API Token: ' + acc.api_token.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            {initialOrders.length <= 1 && (
              <>
                {/* Consignee Details */}
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#3b82f6', fontSize: '16px' }}>3. Consignee (Customer) Details</h4>
                  
                  <div style={styles.row}>
                    <div>
                      <label style={styles.label}>Full Name *</label>
                      <input style={styles.input} type="text" value={consigneeName} onChange={e=>setConsigneeName(e.target.value)} required />
                    </div>
                    <div>
                      <label style={styles.label}>Phone Number *</label>
                      <input style={styles.input} type="tel" value={consigneePhone} onChange={e=>setConsigneePhone(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div style={styles.row}>
                    <div>
                      <label style={styles.label}>City *</label>
                      <input style={styles.input} type="text" value={consigneeCity} onChange={e=>setConsigneeCity(e.target.value)} required />
                    </div>
                    <div>
                      <label style={styles.label}>Email Address</label>
                      <input style={styles.input} type="email" value={consigneeEmail} onChange={e=>setConsigneeEmail(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>Complete Address *</label>
                    <input style={styles.input} type="text" value={consigneeAddress} onChange={e=>setConsigneeAddress(e.target.value)} required />
                  </div>
                </div>

                {/* Package Details */}
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#3b82f6', fontSize: '16px' }}>4. Shipment Details</h4>
                  
                  <div style={styles.row}>
                    <div>
                      <label style={styles.label}>Order ID / Reference *</label>
                      <input style={styles.input} type="text" value={orderId} onChange={e=>setOrderId(e.target.value)} required />
                    </div>
                    <div>
                      <label style={styles.label}>COD Amount (PKR) *</label>
                      <input style={styles.input} type="number" value={codAmount} onChange={e=>setCodAmount(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={styles.label}>Product Description *</label>
                    <input style={styles.input} type="text" value={productDesc} onChange={e=>setProductDesc(e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#3b82f6', fontSize: '16px' }}>{initialOrders.length > 1 ? '3. Common Settings' : '5. Parcel Settings'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={styles.label}>Weight (Kg) *</label>
                  <input style={styles.input} type="number" step="0.01" value={weight} onChange={e=>setWeight(e.target.value)} required />
                </div>
                <div>
                  <label style={styles.label}>Pieces *</label>
                  <input style={styles.input} type="number" value={pieces} onChange={e=>setPieces(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div style={{ textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{ 
                  padding: '14px 32px', 
                  background: 'linear-gradient(135deg, #00e676, #00c853)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '700',
                  fontSize: '16px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Processing...' : (initialOrders.length > 1 ? `🚀 Fulfill ${initialOrders.length} Orders` : '🚀 Generate Booking')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
