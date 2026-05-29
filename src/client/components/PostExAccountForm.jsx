// src/client/components/PostExAccountForm.jsx
import React, { useState } from 'react';

const styles = {
  container: {
    maxWidth: '800px',
    margin: '40px auto',
    padding: '30px',
    background: 'var(--surface, #ffffff)',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid var(--border, #e2e8f0)',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text, #0f172a)'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  section: {
    marginBottom: '24px',
    padding: '20px',
    background: 'var(--surface2, #f8fafc)',
    borderRadius: '8px',
    border: '1px solid var(--border, #e2e8f0)'
  },
  row: {
    display: 'flex',
    gap: '20px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  col: {
    flex: 1,
    minWidth: '200px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    color: 'var(--muted, #64748b)'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border, #cbd5e1)',
    background: 'var(--card, #ffffff)',
    color: 'var(--text, #0f172a)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  toggleTrack: (isOn) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: isOn ? '#3b82f6' : '#cbd5e1',
    position: 'relative',
    transition: 'background 0.3s'
  }),
  toggleThumb: (isOn) => ({
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#ffffff',
    position: 'absolute',
    top: '3px',
    left: isOn ? '23px' : '3px',
    transition: 'left 0.3s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
  }),
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  }
};

export const Toggle = ({ label, checked, onChange, onText = "Yes", offText = "No", hideText = false }) => (
  <div style={styles.toggleContainer} onClick={() => onChange(!checked)}>
    <div style={styles.toggleTrack(checked)}>
      <div style={styles.toggleThumb(checked)} />
    </div>
    <span style={{ fontSize: '14px', fontWeight: '500' }}>
      {label} {!hideText && <span style={{ color: checked ? '#3b82f6' : 'var(--muted, #64748b)', marginLeft: '4px' }}>({checked ? onText : offText})</span>}
    </span>
  </div>
);

export default function PostExAccountForm({ shop, onCancel, onSave, initialData }) {
  const [enabled, setEnabled] = useState(initialData?.is_enabled ?? true);
  const [defaultAcc, setDefaultAcc] = useState(initialData?.is_default ?? false);
  const [apiToken, setApiToken] = useState(initialData?.api_token || '');
  const [loading, setLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(!!initialData);
  const [pickups, setPickups] = useState(initialData?.pickup_address_code ? [{ id: initialData.pickup_address_code, name: 'Saved Address' }] : []);
  
  const [selectedPickup, setSelectedPickup] = useState(initialData?.pickup_address_code || '');
  const [selectedReturn, setSelectedReturn] = useState(initialData?.return_address_code || '');
  const [weight, setWeight] = useState(initialData?.default_weight || '0.5');
  const [remarks, setRemarks] = useState(initialData?.shipper_remarks || '');
  const [orderType, setOrderType] = useState(initialData?.order_type || 'Normal');
  const [shipperHandling, setShipperHandling] = useState(initialData?.shipper_handling || 'Normal');
  const [labelOption, setLabelOption] = useState(initialData?.label_print_option || 'Print Product Name only');

  // Advanced Preferences
  const [autoFulfillment, setAutoFulfillment] = useState(initialData?.auto_fulfillment ?? true);
  const [autoSaveTracking, setAutoSaveTracking] = useState(initialData?.auto_save_tracking ?? false);
  const [markPaidZero, setMarkPaidZero] = useState(initialData?.mark_paid_zero ?? true);
  const [autoCalcWeight, setAutoCalcWeight] = useState(initialData?.auto_calc_weight ?? false);
  const [autoCalcPieces, setAutoCalcPieces] = useState(initialData?.auto_calc_pieces ?? false);
  const [addOrderNotes, setAddOrderNotes] = useState(initialData?.add_order_notes ?? false);

  const validate = async () => {
    if (!apiToken) {
      alert("Please enter API Token to validate.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/postex/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: apiToken })
      });
      const data = await resp.json();
      if (data.success) {
        setPickups(data.pickups || []);
        if (data.pickups?.length > 0) {
          setSelectedPickup(data.pickups[0].id);
          setSelectedReturn(data.pickups[0].id);
        }
        setIsValidated(true);
        alert('Validation Successful! Pickup addresses loaded.');
      } else {
        alert('Validation failed: ' + data.error);
        setIsValidated(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error validating token.');
    }
    setLoading(false);
  };

  const saveAccount = async () => {
    setLoading(true);
    const payload = {
      id: initialData?.id,
      shop,
      api_token: apiToken,
      is_enabled: enabled,
      is_default: defaultAcc,
      pickup_address_code: selectedPickup,
      return_address_code: selectedReturn,
      default_weight: weight,
      shipper_remarks: remarks,
      order_type: orderType,
      shipper_handling: shipperHandling,
      label_print_option: labelOption,
      auto_fulfillment: autoFulfillment,
      auto_save_tracking: autoSaveTracking,
      mark_paid_zero: markPaidZero,
      auto_calc_weight: autoCalcWeight,
      auto_calc_pieces: autoCalcPieces,
      add_order_notes: addOrderNotes
    };

    try {
      const resp = await fetch('/api/postex/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success) {
        alert('Settings saved successfully!');
        if (onSave) onSave();
      } else {
        alert('Failed to save settings: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    }
    setLoading(false);
  };

  const deleteAccount = async () => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/postex/accounts/${initialData.id}?shop=${shop}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) {
        alert('Account deleted successfully!');
        if (onSave) onSave();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting account.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={styles.title}><span style={{ fontSize: '28px' }}>💰</span> PostEx Courier Settings</h2>
        <Toggle label="Enable Booking" checked={enabled} onChange={setEnabled} onText="Enabled" offText="Disabled" hideText />
      </div>
      
      <div style={styles.section}>
        <Toggle label="Set as Default Account" checked={defaultAcc} onChange={setDefaultAcc} />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>API Token *</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            style={{ ...styles.input, flex: 1 }} 
            type="password" 
            value={apiToken} 
            onChange={e => setApiToken(e.target.value)} 
            placeholder="Enter your PostEx API Token" 
          />
          <button style={styles.button} onClick={validate} disabled={loading}>
            {loading ? 'Validating...' : 'Validate Token'}
          </button>
        </div>
      </div>

      <div style={{ ...styles.section, opacity: isValidated ? 1 : 0.6, pointerEvents: isValidated ? 'auto' : 'none' }}>
        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Pickup Address *</label>
            <select style={styles.input} value={selectedPickup} onChange={e => setSelectedPickup(e.target.value)}>
              {pickups.length === 0 && <option value="">Validate to load addresses...</option>}
              {pickups.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Return Address *</label>
            <select style={styles.input} value={selectedReturn} onChange={e => setSelectedReturn(e.target.value)}>
              <option value="same">Same as Pickup Address</option>
              {pickups.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Default Weight *</label>
            <input style={styles.input} type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Shipper Remarks</label>
            <input style={styles.input} type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Call customer before delivery" />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Shipper Type *</label>
            <select style={styles.input} value={orderType} onChange={e => setOrderType(e.target.value)}>
              <option value="Normal">Normal</option>
              <option value="Reversed">Reversed</option>
              <option value="Replacement">Replacement</option>
            </select>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Shipper Handling *</label>
            <select style={styles.input} value={shipperHandling} onChange={e => setShipperHandling(e.target.value)}>
              <option value="Normal">Normal</option>
              <option value="Fragile">Fragile</option>
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Label Print Option *</label>
            <select style={styles.input} value={labelOption} onChange={e => setLabelOption(e.target.value)}>
              <option>Print Product Name only</option>
              <option>Print Product SKU only</option>
              <option>Print Product Name & SKU</option>
              <option>Hide Product Details</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ ...styles.section, opacity: isValidated ? 1 : 0.6, pointerEvents: isValidated ? 'auto' : 'none' }}>
        <h4 style={{ marginBottom: '16px', color: '#3b82f6' }}>Advanced Preferences</h4>
        <div style={styles.grid2Col}>
          <Toggle label="Auto Order Fulfillment" checked={autoFulfillment} onChange={setAutoFulfillment} hideText />
          <Toggle label="Auto Calculate Weight" checked={autoCalcWeight} onChange={setAutoCalcWeight} hideText />
          <Toggle label="Auto Save Tracking Details" checked={autoSaveTracking} onChange={setAutoSaveTracking} hideText />
          <Toggle label="Auto Calculate Pieces" checked={autoCalcPieces} onChange={setAutoCalcPieces} hideText />
          <Toggle label="Mark Paid Order as Zero" checked={markPaidZero} onChange={setMarkPaidZero} hideText />
          <Toggle label="Add Order Notes in Remarks" checked={addOrderNotes} onChange={setAddOrderNotes} hideText />
        </div>
      </div>

      <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {initialData && (
          <button style={{ ...styles.button, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', marginRight: 'auto' }} onClick={deleteAccount} disabled={loading}>
            Delete Account
          </button>
        )}
        <button style={{ ...styles.button, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }} onClick={onCancel}>Cancel</button>
        <button style={styles.button} onClick={saveAccount} disabled={loading || !isValidated}>
          {loading ? 'Saving...' : (initialData ? 'Update Settings' : 'Save Settings')}
        </button>
      </div>
    </div>
  );
}
