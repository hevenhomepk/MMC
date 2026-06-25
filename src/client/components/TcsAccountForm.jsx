// src/client/components/TcsAccountForm.jsx
import React, { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  container: {
    maxWidth: '820px',
    margin: '40px auto',
    padding: '32px',
    background: 'var(--surface, #ffffff)',
    borderRadius: '14px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    border: '1px solid var(--border, #e2e8f0)',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text, #0f172a)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  section: {
    marginBottom: '20px',
    padding: '20px',
    background: 'var(--surface2, #f8fafc)',
    borderRadius: '10px',
    border: '1px solid var(--border, #e2e8f0)',
  },
  sectionHeading: {
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#3b82f6',
    marginBottom: '16px',
  },
  row: { display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' },
  col: { flex: 1, minWidth: '200px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'var(--muted, #64748b)' },
  input: {
    width: '100%',
    padding: '9px 11px',
    borderRadius: '7px',
    border: '1px solid var(--border, #cbd5e1)',
    background: 'var(--card, #ffffff)',
    color: 'var(--text, #0f172a)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  primaryBtn: {
    padding: '10px 22px',
    borderRadius: '7px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  ghostBtn: (color = '#3b82f6') => ({
    padding: '7px 14px',
    borderRadius: '7px',
    border: `1px solid ${color}`,
    background: 'transparent',
    color,
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  }),
  toggleContainer: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  toggleTrack: (on) => ({
    width: '42px', height: '23px', borderRadius: '12px',
    background: on ? '#3b82f6' : '#cbd5e1',
    position: 'relative', flexShrink: 0, transition: 'background 0.25s',
  }),
  toggleThumb: (on) => ({
    width: '17px', height: '17px', borderRadius: '50%', background: '#fff',
    position: 'absolute', top: '3px', left: on ? '22px' : '3px',
    transition: 'left 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
  }),
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

export const Toggle = ({ label, checked, onChange, onText = 'Yes', offText = 'No', hideText = false }) => (
  <div style={s.toggleContainer} onClick={() => onChange(!checked)}>
    <div style={s.toggleTrack(checked)}>
      <div style={s.toggleThumb(checked)} />
    </div>
    <span style={{ fontSize: '14px', fontWeight: '500' }}>
      {label}
      {!hideText && (
        <span style={{ color: checked ? '#3b82f6' : 'var(--muted,#64748b)', marginLeft: '4px' }}>
          ({checked ? onText : offText})
        </span>
      )}
    </span>
  </div>
);

/**
 * Inline alert banner — replaces browser alert() calls.
 * variant: 'error' | 'success' | 'warning' | 'info'
 */
function Banner({ variant = 'info', message, onDismiss }) {
  if (!message) return null;
  const palette = {
    error:   { bg: '#fef2f2', border: '#fca5a5', color: '#b91c1c', icon: '✖' },
    success: { bg: '#f0fdf4', border: '#86efac', color: '#15803d', icon: '✔' },
    warning: { bg: '#fffbeb', border: '#fcd34d', color: '#b45309', icon: '⚠' },
    info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', icon: 'ℹ' },
  };
  const p = palette[variant] || palette.info;
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 14px', borderRadius: '8px', marginBottom: '14px',
        background: p.bg, border: `1px solid ${p.border}`, color: p.color,
        fontSize: '13px', fontWeight: '500', lineHeight: '1.5',
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: '1.4', flexShrink: 0 }}>{p.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.color, fontSize: '16px', lineHeight: 1, padding: 0 }}
          aria-label="Dismiss"
        >×</button>
      )}
    </div>
  );
}

/**
 * Two-step progress indicator.
 * step: 1 | 2
 * step1Done: bool
 * step2Done: bool
 */
function StepIndicator({ step, step1Done, step2Done }) {
  const steps = [
    { n: 1, label: 'Authenticate', done: step1Done },
    { n: 2, label: 'Load Addresses', done: step2Done },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '24px' }}>
      {steps.map((st, idx) => {
        const active = step === st.n;
        const color  = st.done ? '#15803d' : active ? '#2563eb' : '#94a3b8';
        const bg     = st.done ? '#dcfce7' : active ? '#dbeafe' : '#f1f5f9';
        return (
          <React.Fragment key={st.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: bg, border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '700', color,
              }}>
                {st.done ? '✓' : st.n}
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color, whiteSpace: 'nowrap' }}>{st.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ flex: 1, height: '2px', background: step1Done ? '#86efac' : '#e2e8f0', margin: '0 8px 18px' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse legacy pickup_addresses_data JSON blob into dropdown options.
 * Falls back gracefully; used only for pre-existing account edits.
 */
function parseLegacyPickupData(data) {
  if (!data) return [];
  let parsed = data;
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data); } catch { return []; }
  }
  // New API shape: array of { value, label, city }
  if (Array.isArray(parsed)) return parsed;
  // Legacy shape: { detail: [...] }
  if (parsed && Array.isArray(parsed.detail)) {
    return parsed.detail.map(item => ({
      value: item.costcentercode || item.code || '',
      label: `${item.costcentercode || ''} — ${item.costcentername || ''}`,
      city: item.costcentercity || '',
    }));
  }
  return [];
}

function formatExpiry(expiry) {
  if (!expiry) return null;
  try {
    const d = new Date(expiry);
    return isNaN(d.getTime()) ? expiry : d.toLocaleString();
  } catch { return expiry; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function TcsAccountForm({ shop, onCancel, onSave, initialData }) {
  // ── Account info ────────────────────────────────────────────────────────────
  const [username,      setUsername]      = useState(initialData?.username || '');
  const [password,      setPassword]      = useState('');
  const [accountNumber, setAccountNumber] = useState(initialData?.account_number || '');

  // ── Step 1 state ─────────────────────────────────────────────────────────────
  const [step1Done,    setStep1Done]    = useState(!!initialData);
  const [accessToken,  setAccessToken]  = useState(initialData?.access_token || '');
  const [tokenExpiry,  setTokenExpiry]  = useState('');
  const [step1Banner,  setStep1Banner]  = useState(null); // { variant, message }

  // ── Step 2 state ─────────────────────────────────────────────────────────────
  const [step2Done,    setStep2Done]    = useState(!!initialData?.pickup_address);
  const [costCenters,  setCostCenters]  = useState(() => {
    if (initialData?.pickup_addresses_data) return parseLegacyPickupData(initialData.pickup_addresses_data);
    return initialData?.pickup_address
      ? [{ value: initialData.pickup_address, label: initialData.pickup_address + ' (Saved)', city: '' }]
      : [];
  });
  const [step2Banner,  setStep2Banner]  = useState(null);

  // ── Settings ─────────────────────────────────────────────────────────────────
  const [selectedPickup,   setSelectedPickup]   = useState(initialData?.pickup_address || '');
  const [weight,           setWeight]           = useState(initialData?.default_weight || '0.5');
  const [serviceType,      setServiceType]      = useState(initialData?.service_type || 'Express');
  const [labelOption,      setLabelOption]      = useState(initialData?.label_print_option || 'Print Product Name Only');
  const [insuranceOn,      setInsuranceOn]      = useState(initialData?.has_insurance ?? false);
  const [fragile,          setFragile]          = useState(initialData?.is_fragile ?? false);
  const [insuranceAmount,  setInsuranceAmount]  = useState(initialData?.default_insurance || '');
  const [remarks,          setRemarks]          = useState(initialData?.shipper_remarks || '');
  const [shipperPhone,     setShipperPhone]     = useState(initialData?.shipper_phone || '');
  const [enabled,          setEnabled]          = useState(initialData?.is_enabled ?? false);
  const [defaultAcc,       setDefaultAcc]       = useState(initialData?.is_default ?? false);
  const [autoFulfillment,  setAutoFulfillment]  = useState(initialData?.auto_fulfillment ?? true);
  const [autoSaveTracking, setAutoSaveTracking] = useState(initialData?.auto_save_tracking ?? false);
  const [markPaidZero,     setMarkPaidZero]     = useState(initialData?.mark_paid_zero ?? true);
  const [autoCalcWeight,   setAutoCalcWeight]   = useState(initialData?.auto_calc_weight ?? false);
  const [autoCalcPieces,   setAutoCalcPieces]   = useState(initialData?.auto_calc_pieces ?? false);
  const [addOrderNotes,    setAddOrderNotes]    = useState(initialData?.add_order_notes ?? false);

  // Shared loading flag
  const [loading, setLoading] = useState(false);

  // Current active step for the progress indicator
  const activeStep = step1Done ? 2 : 1;

  // ── Step 1: Validate credentials ─────────────────────────────────────────────
  const handleValidate = async () => {
    if (!username || !password) {
      setStep1Banner({ variant: 'error', message: 'Please enter both Username and Password.' });
      return;
    }
    setStep1Banner(null);
    setStep2Banner(null);
    setLoading(true);

    try {
      const resp = await fetch('/api/tcs/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, shop }),
      });
      const data = await resp.json();

      if (!data.success) {
        setStep1Banner({ variant: 'error', message: data.error || 'Authentication failed.' });
        setStep1Done(false);
      } else {
        const receivedToken = data.accesstoken;
        setAccessToken(receivedToken);
        setTokenExpiry(formatExpiry(data.expiry));
        setStep1Done(true);
        setStep1Banner({
          variant: 'success',
          message: `✓ Authenticated successfully.${data.expiry ? '  Token valid until: ' + formatExpiry(data.expiry) : ''}`,
        });

        // ── Automatically trigger Step 2 if account number is present ──────
        if (accountNumber) {
          await loadPickups(receivedToken);
        }
      }
    } catch {
      setStep1Banner({ variant: 'error', message: 'Could not reach the server. Please ensure the app is running and try again.' });
      setStep1Done(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Load pickup addresses ─────────────────────────────────────────────
  const loadPickups = async (token = accessToken) => {
    if (!accountNumber) {
      setStep2Banner({ variant: 'error', message: 'Please enter an Account Number before loading pickup addresses.' });
      return;
    }
    if (!token) {
      setStep2Banner({ variant: 'error', message: 'No access token available. Please complete Step 1 (Validate Credentials) first.' });
      return;
    }
    setStep2Banner(null);
    setLoading(true);

    try {
      const resp = await fetch('/api/tcs/pickups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, accountNumber, accessToken: token, shop }),
      });
      const data = await resp.json();

      if (data.success) {
        // Use the new costCenters array (deduped, formatted)
        const options = data.costCenters || [];
        setCostCenters(options);
        setStep2Done(true);

        if (options.length > 0 && !selectedPickup) {
          setSelectedPickup(options[0].value);
        }
        setStep2Banner({
          variant: 'success',
          message: `${options.length} pickup address${options.length !== 1 ? 'es' : ''} loaded.`,
        });
      } else {
        // Differentiate error types with specific guidance
        let guidance = data.error || 'Failed to load pickup addresses.';
        if (data.code === 'TOKEN_EXPIRED') {
          guidance = 'Your access token has expired. Please click "Validate Credentials" again to get a fresh token.';
          setStep1Done(false);
          setAccessToken('');
        } else if (data.code === 'ACCOUNT_NOT_FOUND') {
          guidance = 'Account number not found. Double-check your TCS account number and try again.';
        } else if (data.code === 'EMPTY_RESPONSE') {
          guidance = 'TCS returned no pickup addresses for this account. Please contact TCS support or verify your account status.';
        } else if (data.code === 'NETWORK_ERROR') {
          guidance = 'Could not reach TCS servers. Please check your internet connection and try again.';
        }
        setStep2Banner({ variant: 'error', message: guidance });
        setStep2Done(false);
      }
    } catch {
      setStep2Banner({ variant: 'error', message: 'Network error loading pickup addresses. Please try again.' });
      setStep2Done(false);
    } finally {
      setLoading(false);
    }
  };

  // Re-load pickups (editing flow)
  const handleReloadPickups = () => loadPickups(accessToken);

  // ── Save account ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!initialData && (!username || !password || !accountNumber)) {
      setStep1Banner({ variant: 'error', message: 'Username, Password, and Account Number are required.' });
      return;
    }
    if (insuranceOn && !insuranceAmount) {
      setStep1Banner({ variant: 'warning', message: 'Please enter a Default Insurance Amount since Insurance is enabled.' });
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
      shipper_phone: shipperPhone,
      service_type: serviceType,
      is_fragile: fragile,
      label_print_option: labelOption,
      auto_fulfillment: autoFulfillment,
      auto_save_tracking: autoSaveTracking,
      mark_paid_zero: markPaidZero,
      auto_calc_weight: autoCalcWeight,
      auto_calc_pieces: autoCalcPieces,
      add_order_notes: addOrderNotes,
      accessToken,
      pickupAddressesData: costCenters.length > 0 ? JSON.stringify({ detail: costCenters }) : null,
    };

    try {
      const resp = await fetch('/api/tcs/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success) {
        if (onSave) onSave();
      } else {
        setStep1Banner({ variant: 'error', message: 'Failed to save settings: ' + data.error });
      }
    } catch {
      setStep1Banner({ variant: 'error', message: 'Error saving settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/tcs/accounts/${initialData.id}?shop=${encodeURIComponent(shop)}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) {
        if (onSave) onSave();
      } else {
        setStep1Banner({ variant: 'error', message: 'Error: ' + data.error });
      }
    } catch {
      setStep1Banner({ variant: 'error', message: 'Error deleting account.' });
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  const settingsLocked = !step1Done;

  return (
    <div style={s.container}>
      {/* ── Header ── */}
      <h2 style={s.title}>
        <span style={{ fontSize: '26px' }}>📦</span> TCS Courier Settings
      </h2>

      {/* ── Progress indicator ── */}
      <StepIndicator step={activeStep} step1Done={step1Done} step2Done={step2Done} />

      {/* ── Top toggles ── */}
      <div style={{ ...s.section, display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
        <Toggle label="Enable Account" checked={enabled} onChange={setEnabled} onText="Enabled" offText="Disabled" />
        <Toggle label="Default Account" checked={defaultAcc} onChange={setDefaultAcc} onText="Default" offText="No" />
      </div>

      {/* ══ STEP 1: Credentials ═══════════════════════════════════════════════ */}
      <div style={s.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={s.sectionHeading}>Step 1 — Account Credentials</p>
          {step1Done && (
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '20px' }}>
              ✓ Authenticated
            </span>
          )}
        </div>

        {/* Banners */}
        <Banner variant={step1Banner?.variant} message={step1Banner?.message} onDismiss={() => setStep1Banner(null)} />

        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>TCS Username *</label>
            <input
              id="tcs-username"
              style={s.input}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. testenvio"
              autoComplete="username"
            />
          </div>
          <div style={s.col}>
            <label style={s.label}>TCS Password {initialData ? '(Leave blank to keep existing)' : '*'}</label>
            <input
              id="tcs-password"
              style={s.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div style={s.col}>
            <label style={s.label}>TCS Account Number *</label>
            <input
              id="tcs-account-number"
              style={s.input}
              type="text"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="e.g. 04011K1"
            />
          </div>
        </div>

        {tokenExpiry && (
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
            🔑 Token valid until: <strong>{tokenExpiry}</strong>
          </p>
        )}

        <button
          id="tcs-validate-btn"
          style={{ ...s.primaryBtn, opacity: loading ? 0.65 : 1 }}
          disabled={loading}
          onClick={handleValidate}
        >
          {loading && !step1Done ? '⏳ Validating…' : step1Done ? '🔄 Re-validate Credentials' : '🔐 Validate Credentials'}
        </button>
      </div>

      {/* ══ STEP 2: Pickup Addresses ═════════════════════════════════════════ */}
      <div style={{ ...s.section, opacity: settingsLocked ? 0.55 : 1, pointerEvents: settingsLocked ? 'none' : 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={s.sectionHeading}>Step 2 — Pickup Address &amp; Cost Center</p>
          {step2Done && (
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '20px' }}>
              ✓ Loaded
            </span>
          )}
        </div>

        {settingsLocked && (
          <Banner variant="info" message="Complete Step 1 (validate credentials) to enable address loading." />
        )}

        <Banner variant={step2Banner?.variant} message={step2Banner?.message} onDismiss={() => setStep2Banner(null)} />

        <div style={s.row}>
          <div style={s.col}>
            <label htmlFor="tcs-pickup-select" style={s.label}>Pickup Address / Cost Center Code *</label>

            {costCenters.length > 0 ? (
              <select
                id="tcs-pickup-select"
                style={s.input}
                value={selectedPickup}
                onChange={e => setSelectedPickup(e.target.value)}
              >
                {costCenters.map((cc, idx) => (
                  <option key={cc.value || idx} value={cc.value}>
                    {cc.label}{cc.city ? ` (${cc.city})` : ''}
                  </option>
                ))}
              </select>
            ) : step1Done ? (
              <>
                <input
                  id="tcs-pickup-select"
                  style={s.input}
                  type="text"
                  value={selectedPickup}
                  onChange={e => setSelectedPickup(e.target.value)}
                  placeholder="Enter Cost Center Code manually"
                />
                <p style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>
                  ⚠️ No pickup addresses loaded yet. Click "Load Pickup Addresses" or enter a code manually.
                </p>
              </>
            ) : (
              <select id="tcs-pickup-select" style={{ ...s.input, color: '#94a3b8' }} disabled>
                <option>Validate credentials first to load addresses…</option>
              </select>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                id="tcs-load-pickups-btn"
                style={{ ...s.ghostBtn(), opacity: loading || settingsLocked ? 0.55 : 1 }}
                onClick={() => loadPickups()}
                disabled={loading || settingsLocked}
              >
                {loading && step1Done ? '⏳ Loading…' : '📍 Load Pickup Addresses'}
              </button>
              {initialData && (
                <button
                  id="tcs-reload-pickups-btn"
                  style={{ ...s.ghostBtn('#0891b2'), opacity: loading ? 0.55 : 1 }}
                  onClick={handleReloadPickups}
                  disabled={loading}
                >
                  🔄 Reload from TCS
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Shipment Defaults ════════════════════════════════════════════════ */}
      <div style={{ ...s.section, opacity: settingsLocked ? 0.55 : 1, pointerEvents: settingsLocked ? 'none' : 'auto' }}>
        <p style={s.sectionHeading}>Shipment Defaults</p>

        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Default Weight (kg) *</label>
            <input id="tcs-weight" style={s.input} type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div style={s.col}>
            <label style={s.label}>Service Type *</label>
            <select id="tcs-service-type" style={s.input} value={serviceType} onChange={e => setServiceType(e.target.value)}>
              <option value="Express">Express</option>
              <option value="Economy Express">Economy Express</option>
              <option value="Same Day">Same Day</option>
              <option value="Overland">Overland</option>
            </select>
          </div>
          <div style={s.col}>
            <label style={s.label}>Label Print Option</label>
            <select id="tcs-label-option" style={s.input} value={labelOption} onChange={e => setLabelOption(e.target.value)}>
              <option>Print Product Name Only</option>
              <option>Print Product SKU Only</option>
              <option>Print Product Name &amp; SKU</option>
              <option>Print Product Name + Extra Options + SKU</option>
              <option>Hide Product Info</option>
              <option>Print Store Name Only</option>
            </select>
          </div>
        </div>

        <div style={s.row}>
          <div style={{ ...s.col, display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Toggle label="Insurance" checked={insuranceOn} onChange={setInsuranceOn} onText="On" offText="Off" />
            <Toggle label="Fragile" checked={fragile} onChange={setFragile} />
          </div>
          <div style={s.col}>
            {insuranceOn && (
              <>
                <label style={s.label}>Default Insurance Amount *</label>
                <input
                  id="tcs-insurance-amount"
                  style={s.input}
                  type="number"
                  value={insuranceAmount}
                  onChange={e => setInsuranceAmount(e.target.value)}
                  placeholder="e.g. 10"
                />
              </>
            )}
          </div>
        </div>

        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Shipper Phone (Required for TCS)</label>
            <input
              id="tcs-shipper-phone"
              style={s.input}
              type="text"
              value={shipperPhone}
              onChange={e => setShipperPhone(e.target.value)}
              placeholder="e.g. 03001234567"
            />
          </div>
          <div style={s.col}>
            <label style={s.label}>Shipper Remarks (Optional)</label>
            <input
              id="tcs-remarks"
              style={s.input}
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Please call customer before delivery"
            />
          </div>
        </div>
      </div>

      {/* ══ Advanced Preferences ═════════════════════════════════════════════ */}
      <div style={{ ...s.section, opacity: settingsLocked ? 0.55 : 1, pointerEvents: settingsLocked ? 'none' : 'auto' }}>
        <p style={s.sectionHeading}>Advanced Preferences</p>
        <div style={s.grid2}>
          <Toggle label="Auto Order Fulfillment"    checked={autoFulfillment}  onChange={setAutoFulfillment}  hideText />
          <Toggle label="Auto Calculate Weight"     checked={autoCalcWeight}   onChange={setAutoCalcWeight}   hideText />
          <Toggle label="Auto Save Tracking Details" checked={autoSaveTracking} onChange={setAutoSaveTracking} hideText />
          <Toggle label="Auto Calculate Pieces"     checked={autoCalcPieces}   onChange={setAutoCalcPieces}   hideText />
          <Toggle label="Mark Paid Order as Zero"   checked={markPaidZero}     onChange={setMarkPaidZero}     hideText />
          <Toggle label="Add Order Notes in Remarks" checked={addOrderNotes}   onChange={setAddOrderNotes}    hideText />
        </div>
      </div>

      {/* ══ Action buttons ═══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
        {initialData && (
          <button
            id="tcs-delete-btn"
            style={{ ...s.ghostBtn('#ef4444'), marginRight: 'auto' }}
            onClick={handleDelete}
            disabled={loading}
          >
            Delete Account
          </button>
        )}
        {onCancel && (
          <button
            id="tcs-cancel-btn"
            style={{ ...s.ghostBtn('#64748b') }}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          id="tcs-save-btn"
          style={{ ...s.primaryBtn, padding: '12px 30px', fontSize: '15px', opacity: loading ? 0.65 : 1 }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '⏳ Saving…' : initialData ? 'Update Settings' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
