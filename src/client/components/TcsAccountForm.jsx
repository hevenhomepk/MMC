// src/client/components/TcsAccountForm.jsx
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
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)', // Blue for validate/save
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

export default function TcsAccountForm({ shop, onCancel, onSave, initialData }) {
  // Top toggles
  const [enabled, setEnabled] = useState(initialData?.is_enabled ?? false);
  const [defaultAcc, setDefaultAcc] = useState(initialData?.is_default ?? false);
  
  // Account Info
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState(''); // Don't prefill password for security, but allow blank if they don't want to change it
  const [accountNumber, setAccountNumber] = useState(initialData?.account_number || '');
  
  // Form State
  const [loading, setLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(!!initialData); // Pre-validated if editing
  const [pickups, setPickups] = useState(initialData?.pickup_address ? [{ id: initialData.pickup_address, name: initialData.pickup_address + ' (Saved)' }] : []);
  const [accessToken, setAccessToken] = useState(initialData?.access_token || '');
  
  // Settings
  const [selectedPickup, setSelectedPickup] = useState(initialData?.pickup_address || '');
  const [weight, setWeight] = useState(initialData?.default_weight || '0.5');
  const [serviceType, setServiceType] = useState(initialData?.service_type || 'Express');
  const [labelOption, setLabelOption] = useState(initialData?.label_print_option || 'Print Product Name Only');
  const [insuranceOn, setInsuranceOn] = useState(initialData?.has_insurance ?? false);
  const [fragile, setFragile] = useState(initialData?.is_fragile ?? false);
  const [insuranceAmount, setInsuranceAmount] = useState(initialData?.default_insurance || '');
  const [remarks, setRemarks] = useState(initialData?.shipper_remarks || '');

  // Advanced Preferences
  const [autoFulfillment, setAutoFulfillment] = useState(initialData?.auto_fulfillment ?? true);
  const [autoSaveTracking, setAutoSaveTracking] = useState(initialData?.auto_save_tracking ?? false);
  const [markPaidZero, setMarkPaidZero] = useState(initialData?.mark_paid_zero ?? true);
  const [autoCalcWeight, setAutoCalcWeight] = useState(initialData?.auto_calc_weight ?? false);
  const [autoCalcPieces, setAutoCalcPieces] = useState(initialData?.auto_calc_pieces ?? false);
  const [addOrderNotes, setAddOrderNotes] = useState(initialData?.add_order_notes ?? false);

  const validate = async () => {
    if (!username || !password || !accountNumber) {
      alert("Please enter Username, Password, and Account Number to validate.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/tcs/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, accountNumber })
      });
      const data = await resp.json();
      if (data.success) {
        setPickups(data.data.pickups || []);
        if (data.data.pickups?.length > 0) {
          setSelectedPickup(data.data.pickups[0].id);
        }
        setAccessToken(data.data.accessToken || '');
        setIsValidated(true);
        alert('Validation Successful! Pickup addresses loaded.');
      } else {
        alert('Validation failed: ' + data.error);
        setIsValidated(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error validating credentials. Ensure the server is running.');
    }
    setLoading(false);
  };

  const saveAccount = async () => {
    if (insuranceOn && !insuranceAmount) {
      alert("Please provide the Default Insurance value since Insurance is enabled.");
      return;
    }
    
    setLoading(true);
    const payload = {
      id: initialData?.id,
      shop,
      username,
      password,
      accountNumber,
      is_enabled: enabled,
      is_default: defaultAcc,
      pickup_address: selectedPickup,
      default_weight: parseFloat(weight) || 0.5,
      has_insurance: insuranceOn,
      default_insurance: insuranceOn ? parseFloat(insuranceAmount) : null,
      shipper_remarks: remarks,
      service_type: serviceType,
      is_fragile: fragile,
      label_print_option: labelOption,
      auto_fulfillment: autoFulfillment,
      auto_save_tracking: autoSaveTracking,
      mark_paid_zero: markPaidZero,
      auto_calc_weight: autoCalcWeight,
      auto_calc_pieces: autoCalcPieces,
      add_order_notes: addOrderNotes,
      accessToken: accessToken
    };

    try {
      const resp = await fetch('/api/tcs/accounts', {
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
      const resp = await fetch(`/api/tcs/accounts/${initialData.id}`, { method: 'DELETE' });
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
      <h2 style={styles.title}>
        <span style={{ fontSize: '28px' }}>📦</span> TCS Courier Settings
      </h2>
      
      {/* Top Toggles */}
      <div style={{ ...styles.section, display: 'flex', gap: '30px' }}>
        <Toggle label="Enable Account" checked={enabled} onChange={setEnabled} onText="Enabled" offText="Disabled" />
        <Toggle label="Default Account" checked={defaultAcc} onChange={setDefaultAcc} onText="Default" offText="No" />
      </div>

      {/* Credentials Section */}
      <div style={styles.section}>
        <h4 style={{ marginBottom: '16px', color: '#3b82f6' }}>Account Credentials</h4>
        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>TCS Username *</label>
            <input style={styles.input} type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. testenvio" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>TCS Password {initialData ? "(Leave blank to keep existing)" : "*"}</label>
              <input style={styles.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>TCS Account Number *</label>
            <input style={styles.input} type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 04011K1" />
          </div>
        </div>
        <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={validate}>
          {loading ? 'Validating...' : 'Validate Credentials'}
        </button>
      </div>

      {/* Shipment Settings (Enabled only after validation, or visible but empty) */}
      <div style={{ ...styles.section, opacity: isValidated ? 1 : 0.6, pointerEvents: isValidated ? 'auto' : 'none' }}>
        <h4 style={{ marginBottom: '16px', color: '#3b82f6' }}>Shipment Defaults</h4>
        
        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Pickup Address / Cost Center</label>
            <select style={styles.input} value={selectedPickup} onChange={e => setSelectedPickup(e.target.value)}>
              {pickups.length === 0 && <option value="">Validate to load pickups...</option>}
              {pickups.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Default Weight (Kg) *</label>
            <input style={styles.input} type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Service Type *</label>
            <select style={styles.input} value={serviceType} onChange={e => setServiceType(e.target.value)}>
              <option value="Express">Express</option>
              <option value="Economy Express">Economy Express</option>
              <option value="Same Day">Same Day</option>
              <option value="Overland">Overland</option>
            </select>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Label Print Option</label>
            <select style={styles.input} value={labelOption} onChange={e => setLabelOption(e.target.value)}>
              <option>Print Product Name Only</option>
              <option>Print Product SKU Only</option>
              <option>Print Product Name & SKU</option>
              <option>Print Product Name + Extra Options + SKU</option>
              <option>Hide Product Info</option>
              <option>Print Store Name Only</option>
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.col}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '100%' }}>
              <Toggle label="Insurance" checked={insuranceOn} onChange={setInsuranceOn} onText="On" offText="Off" />
              <Toggle label="Fragile" checked={fragile} onChange={setFragile} />
            </div>
          </div>
          <div style={styles.col}>
            {insuranceOn && (
              <>
                <label style={styles.label}>Default Insurance Amount *</label>
                <input style={styles.input} type="number" value={insuranceAmount} onChange={e => setInsuranceAmount(e.target.value)} placeholder="e.g. 10" />
              </>
            )}
          </div>
        </div>

        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Shipper Remarks (Optional)</label>
            <input style={styles.input} type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Please call customer before delivery" />
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
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

      {/* Save / Cancel Buttons */}
      <div style={{ textAlign: 'right', marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {initialData && (
          <button 
            style={{ ...styles.button, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', marginRight: 'auto' }} 
            onClick={deleteAccount}
            disabled={loading}
          >
            Delete Account
          </button>
        )}
        {onCancel && (
          <button 
            style={{ ...styles.button, background: 'var(--surface2, #f1f5f9)', color: 'var(--text, #0f172a)', border: '1px solid var(--border)' }} 
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button style={{ ...styles.button, padding: '14px 32px', fontSize: '16px' }} onClick={saveAccount} disabled={loading}>
          {loading ? 'Saving...' : (initialData ? 'Update Settings' : 'Save Settings')}
        </button>
      </div>

    </div>
  );
}
