// src/client/utils/customLabel.js
// Renders app-generated ("custom") courier labels with the merchant's own logo,
// then opens a print window.
//
// NOTE: JsBarcode + QR are loaded at RUNTIME from a CDN (not bundled). This keeps
// the webpack build free of these dependencies, so the deploy VM — which rebuilds
// from source without `npm install` — can never fail on a missing module. If the
// CDN is unreachable, labels still print (barcode falls back to text, QR omitted).

const CDN = {
  jsbarcode: 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js', // window.JsBarcode
  qrcode:    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',           // window.qrcode
};

const _scripts = {};
function loadScript(src) {
  if (_scripts[src]) return _scripts[src];
  _scripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
  return _scripts[src];
}

async function ensureLibs() {
  // Best-effort: don't block printing if a CDN is unreachable.
  await Promise.allSettled([loadScript(CDN.jsbarcode), loadScript(CDN.qrcode)]);
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function barcodeDataUrl(value) {
  if (typeof window.JsBarcode !== 'function') return '';
  try {
    const canvas = document.createElement('canvas');
    window.JsBarcode(canvas, String(value || ''), {
      format: 'CODE128', displayValue: true, fontSize: 14,
      height: 45, margin: 0, width: 1.6,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('[customLabel] barcode failed for', value, e.message);
    return '';
  }
}

function qrDataUrl(value) {
  if (typeof window.qrcode !== 'function') return '';
  try {
    const qr = window.qrcode(0, 'M'); // type 0 = auto-size, error correction level M
    qr.addData(String(value || ''));
    qr.make();
    return qr.createDataURL(4, 0); // (cellSize, margin) → GIF data URL
  } catch (e) {
    console.warn('[customLabel] QR failed for', value, e.message);
    return '';
  }
}

// Page layout per label size
const PAGE_CSS = {
  'A4-3':    '@page { size: A4; margin: 8mm; } .label { height: 88mm; page-break-inside: avoid; } .label:nth-child(3n) { page-break-after: always; }',
  'A4-1':    '@page { size: A4; margin: 12mm; } .label { page-break-after: always; }',
  'THERMAL': '@page { size: 6in 4in; margin: 4mm; } .label { page-break-after: always; }',
};

function labelHtml(b, settings, barcodeImg, qrImg) {
  const logo = settings.logo_data
    ? `<img src="${esc(settings.logo_data)}" alt="logo" style="max-height:46px;max-width:150px;object-fit:contain;" />`
    : `<div style="font-weight:800;font-size:18px;">${esc(settings.shipper_name || b.courier || '')}</div>`;

  const shipperName = settings.shipper_name || settings.website || '';
  const shipperLine = [settings.shipper_address, settings.shipper_city].filter(Boolean).join(', ');
  const dest = b.consignee_city || '';
  const address = [b.consignee_address, b.consignee_city].filter(Boolean).join(', ');
  const amount = b.cod_amount != null ? `Rs ${b.cod_amount}` : '';
  const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString() : '';

  return `
  <div class="label">
    <div class="grid">
      <div class="cell">
        <div class="cell-title">Customer Information</div>
        <div class="kv"><b>Name:</b> ${esc(b.consignee_name)}</div>
        <div class="kv"><b>Phone:</b> ${esc(b.consignee_phone || '-')}</div>
        <div class="kv"><b>Address:</b> ${esc(address || '-')}</div>
        <div class="sep"></div>
        <div class="kv"><b>Destination:</b> ${esc(dest)}</div>
        <div class="kv"><b>Order:</b> ${esc(b.order_id)}</div>
      </div>

      <div class="cell">
        <div class="cell-title">Brand Information</div>
        <div class="kv"><b>Shipper:</b> ${esc(shipperName)}${settings.shipper_phone ? '&nbsp;&nbsp;' + esc(settings.shipper_phone) : ''}</div>
        <div class="kv"><b>Shipper Address:</b> ${esc(shipperLine || '-')}</div>
        <div class="amount">Amount: ${esc(amount)}</div>
      </div>

      <div class="cell">
        <div class="cell-title">Parcel Information</div>
        <div class="parcel-top">
          ${logo}
          ${qrImg ? `<img src="${qrImg}" style="width:56px;height:56px;" />` : ''}
        </div>
        ${barcodeImg ? `<div style="text-align:center;"><img src="${barcodeImg}" style="max-width:100%;height:44px;" /></div>` : `<div style="text-align:center;font-family:monospace;font-weight:700;">${esc(b.tracking_number)}</div>`}
        <div class="pgrid">
          <div><b>Service:</b> ${esc(b.service_type || '-')}</div><div><b>Courier:</b> ${esc(b.courier)}</div>
          <div><b>Date:</b> ${esc(dateStr)}</div><div><b>Weight:</b> ${esc(b.weight || '-')}</div>
          <div><b>Pieces:</b> ${esc(b.pieces || 1)}</div><div><b>Qty:</b> ${esc(b.pieces || 1)}</div>
        </div>
      </div>
    </div>

    <div class="row"><b>Remarks:</b> ${esc(b.remarks || '-')}</div>
    <div class="row products"><b>Products:</b> ${esc(b.product_details || '-')}</div>
  </div>`;
}

/**
 * Build the full HTML document and open a print window.
 * @param {Object[]} bookings  rows from /api/bookings
 * @param {Object}   settings  shop_settings row (logo_data, shipper_*, label_size)
 */
export async function printCustomLabels(bookings, settings = {}) {
  if (!bookings || bookings.length === 0) return;
  const size = settings.label_size || 'A4-3';

  await ensureLibs();

  const labels = bookings.map(b =>
    labelHtml(b, settings, barcodeDataUrl(b.tracking_number), qrDataUrl(b.tracking_number))
  );

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Labels</title>
  <style>
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
    body { margin: 0; color: #111; }
    ${PAGE_CSS[size] || PAGE_CSS['A4-3']}
    .label { border: 1px solid #000; margin: 0 0 6mm 0; padding: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }
    .cell { border-right: 1px solid #000; padding: 6px 8px; font-size: 11px; min-height: 120px; }
    .cell:last-child { border-right: none; }
    .cell-title { text-align: center; font-weight: 800; border-bottom: 1px solid #000; margin: -6px -8px 6px -8px; padding: 4px; background:#f2f2f2; }
    .kv { margin: 3px 0; line-height: 1.35; }
    .sep { border-top: 1px solid #000; margin: 6px -8px; }
    .amount { text-align: center; font-size: 18px; font-weight: 800; margin-top: 10px; }
    .parcel-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .pgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 11px; border-top: 1px solid #000; margin-top: 6px; padding-top: 4px; }
    .row { border-top: 1px solid #000; padding: 5px 8px; font-size: 11px; }
    .products { min-height: 40px; }
    @media screen { body { background:#e5e7eb; padding: 16px; } .label { background:#fff; } }
  </style></head>
  <body onload="setTimeout(function(){ window.focus(); window.print(); }, 300)">
    ${labels.join('\n')}
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to print labels.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
