// src/client/utils/customLabel.js
// Renders app-generated ("custom") courier CN labels, then opens a print window.
//
// The label FORMAT is driven by the shop's saved "Label Size" (settings.label_size,
// set in Shipper Settings). Nine formats are supported, matching the reference PDFs
// in D:\AI\Temp Work\Couriers\tcsformat:
//
//   A4-3              A4 Standard - 3 Per Page   (3-column label, 3 / A4 page)
//   A4-4              A4 Standard - 4 Per Page   (3-column label, 4 / A4 page)
//   8X4               8x4 inch - 1 Per Page      (3-column label, compact footer)
//   THERMAL-6X3       6x3 inch - Thermal         (vertical label)
//   THERMAL-6X4       6x4 inch - Thermal         (vertical label)
//   THERMAL-4X6       4x6 inch - Thermal         (vertical label)
//   THERMAL-3X4       3x4 inch - Thermal         (vertical label)
//   A4-LABEL-INVOICE  A4 - Label & Invoice       (3-column label + invoice)
//   A4-INVOICE        A4 - Invoice only          (invoice block)
//
// Unlike the courier's native ("api") label, the custom label shows the COURIER
// COMPANY logo (chosen from booking.courier — see courierLogos.js). If the shop
// uploaded its own logo it is shown as a small brand mark alongside.
//
// NOTE: JsBarcode + QR are loaded at RUNTIME from a CDN (not bundled), so the deploy
// VM that rebuilds from source without `npm install` can never fail on a missing
// module. If a CDN is unreachable, labels still print (barcode falls back to text,
// QR omitted).

import { courierLogoSvg } from './courierLogos';

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

function barcodeDataUrl(value, opts = {}) {
  if (typeof window.JsBarcode !== 'function' || value == null || value === '') return '';
  try {
    const canvas = document.createElement('canvas');
    window.JsBarcode(canvas, String(value), {
      format: 'CODE128', displayValue: false, margin: 0,
      height: opts.height || 40, width: opts.width || 1.5,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('[customLabel] barcode failed for', value, e.message);
    return '';
  }
}

function qrDataUrl(value) {
  if (typeof window.qrcode !== 'function' || value == null || value === '') return '';
  try {
    const qr = window.qrcode(0, 'M'); // type 0 = auto-size, error correction level M
    qr.addData(String(value));
    qr.make();
    return qr.createDataURL(4, 0); // (cellSize, margin) → GIF data URL
  } catch (e) {
    console.warn('[customLabel] QR failed for', value, e.message);
    return '';
  }
}

// ── small helpers ────────────────────────────────────────────────────────────
const money = (v) => (v == null || v === '' ? '' : `Rs ${v}`);
const dateStr = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '');
const dateTimeStr = (v) => (v ? new Date(v).toLocaleString('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).replace(',', '') : '');

function fieldValues(b, settings) {
  return {
    name: b.consignee_name,
    phone: b.consignee_phone || '-',
    address: [b.consignee_address, b.consignee_city].filter(Boolean).join(' ') || (b.consignee_city || '-'),
    dest: b.consignee_city || '',
    order: b.order_id,
    tracking: b.tracking_number,
    courier: b.courier || '',
    amount: money(b.cod_amount),
    service: b.service_type || '-',
    weight: b.weight || '-',
    pieces: b.pieces || 1,
    fragile: b.fragile == null ? '-' : (b.fragile === false ? 'false' : String(b.fragile)),
    date: dateStr(b.created_at),
    remarks: b.remarks || '-',
    products: b.product_details || '-',
    shipperName: settings.shipper_name || settings.website || '',
    shipperPhone: settings.shipper_phone || '',
    shipperAddress: [settings.shipper_address, settings.shipper_city].filter(Boolean).join(', ') || '-',
  };
}

// Optional shop brand logo (shown small; the courier logo remains primary).
function brandMark(settings) {
  return settings.logo_data
    ? `<img class="brand-mark" src="${esc(settings.logo_data)}" alt="brand" />`
    : '';
}

// ── LAYOUT A: 3-column label (Customer | Brand | Parcel) ─────────────────────
function labelBlock3(b, settings, assets, opts = {}) {
  const f = fieldValues(b, settings);
  const compact = !!opts.compact; // 8x4: Products + Remarks share one footer row

  const footer = compact
    ? `<tr class="foot">
         <td colspan="2" class="products"><b>Products:</b> ${esc(f.products)}</td>
         <td class="remarks"><b>Remarks:</b> ${esc(f.remarks)}</td>
       </tr>`
    : `<tr class="foot"><td colspan="3" class="remarks"><b>Remarks:</b> ${esc(f.remarks)}</td></tr>
       <tr class="foot"><td colspan="3" class="products"><b>Products:</b> ${esc(f.products)}</td></tr>`;

  return `
  <div class="item">
    <table class="lbl3">
      <tr class="hdr">
        <td>Customer Information</td>
        <td>Brand Information</td>
        <td>Parcel Information</td>
      </tr>
      <tr class="cells">
        <td class="cust">
          <div class="sub">
            <div><b>Name:</b> ${esc(f.name)}</div>
            <div><b>Phone:</b> ${esc(f.phone)}</div>
            <div><b>Address:</b> ${esc(f.address)}</div>
          </div>
          <div class="sub"><b>Destination:</b> ${esc(f.dest)}</div>
          <div class="order-wrap">
            <div>
              <div><b>Order:</b> ${esc(f.order)}</div>
              ${assets.order ? `<img class="bc-sm" src="${assets.order}" />` : ''}
            </div>
            ${assets.qr ? `<img class="qr" src="${assets.qr}" />` : ''}
          </div>
        </td>
        <td class="brand">
          ${brandMark(settings)}
          <div class="shipper-row"><span><b>Shipper:</b> ${esc(f.shipperName)}</span><span>${esc(f.shipperPhone)}</span></div>
          <div><b>Shipper Address:</b> ${esc(f.shipperAddress)}</div>
          <div class="amount"><b>Amount:</b> ${esc(f.amount)}</div>
          ${assets.track ? `<div class="amount-bc"><img src="${assets.track}" /></div>` : ''}
        </td>
        <td class="parcel">
          <div class="parcel-top">
            ${assets.logo}
            ${assets.qr ? `<img class="qr" src="${assets.qr}" />` : ''}
          </div>
          <div class="track">
            ${assets.track ? `<img class="bc" src="${assets.track}" />` : ''}
            <div class="track-no">${esc(f.tracking)}</div>
          </div>
          <table class="pgrid">
            <tr><td><b>Service:</b> ${esc(f.service)}</td><td class="r"><b>Fragile:</b> ${esc(f.fragile)}</td></tr>
            <tr><td><b>Date:</b> ${esc(f.date)}</td><td class="r"><b>Weight:</b> ${esc(f.weight)}</td></tr>
            <tr><td><b>Pieces:</b> ${esc(f.pieces)}</td><td class="r"><b>Qty:</b> ${esc(f.pieces)}</td></tr>
          </table>
        </td>
      </tr>
      ${footer}
    </table>
  </div>`;
}

// ── LAYOUT B: vertical thermal label ─────────────────────────────────────────
function thermalBlock(b, settings, assets) {
  const f = fieldValues(b, settings);
  return `
  <div class="item thm">
    <div class="thm-top">
      ${assets.trackTall ? `<img class="bc-top" src="${assets.trackTall}" />` : ''}
      <div class="track-no">${esc(f.tracking)}</div>
    </div>
    <div class="thm-logo-row">
      ${assets.logo}
      ${assets.qr ? `<img class="qr" src="${assets.qr}" />` : ''}
    </div>
    <div class="thm-box">
      <div class="box-hdr">Customer Details</div>
      <div class="box-sec">
        <div><b>Name:</b> ${esc(f.name)}</div>
        <div><b>Phone:</b> ${esc(f.phone)}</div>
        <div><b>Address:</b> ${esc(f.address)}</div>
      </div>
      <div class="box-sec"><b>Destination:</b> ${esc(f.dest)}</div>
      <div class="box-sec cod">
        <div class="cod-amt"><b>COD:</b> ${esc(f.amount)}</div>
        ${assets.track ? `<img class="bc-cod" src="${assets.track}" />` : ''}
      </div>
      <div class="box-sec order-row">
        <div><b>Order:</b> ${esc(f.order)}</div>
        ${assets.order ? `<img class="bc-sm" src="${assets.order}" />` : ''}
      </div>
      <table class="pgrid2">
        <tr><td><b>Date:</b> ${esc(f.date)}</td><td><b>Fragile:</b> ${esc(f.fragile)}</td></tr>
        <tr><td><b>Service:</b> ${esc(f.service)}</td><td><b>Weight:</b> ${esc(f.weight)}</td></tr>
        <tr><td><b>Pieces:</b> ${esc(f.pieces)}</td><td><b>Qty:</b> ${esc(f.pieces)}</td></tr>
      </table>
      <div class="box-sec"><b>Remarks:</b> ${esc(f.remarks)}</div>
      <div class="box-sec"><b>Products:</b> ${esc(f.products)}</div>
      <div class="box-sec shipper">
        <div class="sr"><span><b>Shipper Name:</b> ${esc(f.shipperName)}</span><span><b>Shipper Phone:</b> ${esc(f.shipperPhone)}</span></div>
        <div><b>Shipper Address:</b> ${esc(f.shipperAddress)}</div>
      </div>
    </div>
  </div>`;
}

// ── LAYOUT B2: landscape thermal (6x4 / 6x3) ─────────────────────────────────
// Wide-but-short pages can't fit the tall vertical stack, so these use a 2-column
// (Customer Information | Shipment Information) grid with pipe-separated detail rows.
function thermalLandscapeBlock(b, settings, assets) {
  const f = fieldValues(b, settings);
  const sep = ' &nbsp;|&nbsp; ';
  const detail = [
    `<b>Date:</b> ${esc(f.date)}`, `<b>Service:</b> ${esc(f.service)}`, `<b>Fragile:</b> ${esc(f.fragile)}`,
    `<b>Pieces:</b> ${esc(f.pieces)}`, `<b>Qty:</b> ${esc(f.pieces)}`, `<b>Weight:</b> ${esc(f.weight)}`,
  ].join(sep);
  return `
  <div class="item thml">
    <table class="thml-grid">
      <tr class="hdr"><td>Customer Information</td><td>Shipment Information</td></tr>
      <tr class="cells">
        <td class="cust">
          <div class="sub">
            <div><b>Name:</b> ${esc(f.name)}</div>
            <div><b>Phone:</b> ${esc(f.phone)}</div>
            <div><b>Address:</b> ${esc(f.address)}</div>
          </div>
          <div class="sub"><b>Destination:</b> ${esc(f.dest)}</div>
          <div class="sub cod">
            <span class="cod-amt"><b>COD:</b> ${esc(f.amount)}</span>
            ${assets.track ? `<img src="${assets.track}" />` : ''}
          </div>
        </td>
        <td class="ship">
          <div class="ship-top">${assets.logo}${assets.qr ? `<img class="qr" src="${assets.qr}" />` : ''}</div>
          <div class="track">${assets.track ? `<img class="bc" src="${assets.track}" />` : ''}<div class="track-no">${esc(f.tracking)}</div></div>
          <div class="order"><b>Order:</b> ${esc(f.order)}</div>
        </td>
      </tr>
    </table>
    <div class="thml-row detail">${detail}</div>
    <div class="thml-row"><b>Remarks:</b> ${esc(f.remarks)}</div>
    <div class="thml-row products"><b>Products:</b> ${esc(f.products)}</div>
    <div class="thml-row shipper"><b>Shipper:</b> ${esc(f.shipperName)}${sep}${esc(f.shipperPhone)}${sep}${esc(f.shipperAddress)}</div>
  </div>`;
}

// ── LAYOUT C: invoice block ──────────────────────────────────────────────────
// Parse "1x Item, 2 x Item2" / "[ 1 x Item ]" style product_details into rows.
function parseItems(products) {
  if (!products) return [];
  return String(products)
    .replace(/^[\s[]+|[\s\]]+$/g, '')
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+)\s*x\s*(.+)$/i);
      return m ? { qty: parseInt(m[1], 10), name: m[2].trim() } : { qty: 1, name: part.trim() };
    });
}

function invoiceBlock(b, settings, assets) {
  const f = fieldValues(b, settings);
  const items = parseItems(b.product_details);
  const itemQty = items.reduce((a, it) => a + (it.qty || 0), 0) || (b.pieces || 1);
  const itemRows = (items.length ? items : [{ qty: b.pieces || 1, name: f.products }])
    .map((it) => `<tr><td>${esc(it.qty)}</td><td>${esc(it.name)}</td><td>-</td><td>-</td></tr>`)
    .join('');

  const itemsTotal = b.order_amount ? money(b.order_amount) : '-';
  const orderTotal = money(b.cod_amount);

  return `
  <div class="item inv">
    <div class="inv-head">
      <div class="inv-brand">
        <div><b>Brand:</b> ${esc(f.shipperName)}</div>
        <div><b>Helpline:</b> ${esc(f.shipperPhone || '-')}</div>
        <div><b>Address:</b> ${esc(f.shipperAddress)}</div>
      </div>
      <div class="inv-title">Invoice</div>
    </div>
    <table class="inv3">
      <tr>
        <td class="ic-cust">
          <div class="ih">Customer Details</div>
          <div class="sp"><b>Name:</b> ${esc(f.name)}</div>
          <div><b>Phone:</b> ${esc(f.phone)}</div>
          <div><b>Address:</b> ${esc(f.address)}</div>
          <div><b>City:</b> ${esc(f.dest)}</div>
        </td>
        <td class="ic-mid">
          <div class="order"><b>Order:</b> ${esc(f.order)}</div>
          ${assets.track ? `<img class="bc" src="${assets.track}" />` : ''}
          <div class="sp"><b>Weight:</b> ${esc(f.weight)}</div>
          <div><b>Booked:</b> ${esc(dateTimeStr(b.created_at))}</div>
        </td>
        <td class="ic-cour">
          <div class="ih">Courier Details</div>
          <div class="sp"><b>Name:</b> ${esc(f.courier)}</div>
          <div><b>Tracking:</b> ${esc(f.tracking)}</div>
          ${assets.track ? `<img class="bc" src="${assets.track}" />` : ''}
        </td>
      </tr>
    </table>
    <table class="inv-items">
      <tr class="ih"><th class="qty">Qty</th><th class="item-col">Item</th><th class="sku">SKU</th><th class="price">Price</th></tr>
      ${itemRows}
    </table>
    <table class="inv-totals">
      <tr><td>Items Quantity</td><td>${esc(itemQty)}</td></tr>
      <tr><td>Items Total</td><td>${esc(itemsTotal)}</td></tr>
      <tr><td>Shipping</td><td>-</td></tr>
      <tr><td>Discount</td><td>-</td></tr>
      <tr><td>Order Total</td><td>${esc(orderTotal)}</td></tr>
      <tr><td>COD Amount</td><td>${esc(money(b.cod_amount))}</td></tr>
    </table>
  </div>`;
}

// ── format metadata: page size, pagination, and which renderer(s) to use ─────
const FORMATS = {
  // margin:0 => print hugs the top-left corner AND suppresses the browser's auto
  // page header/footer (title, date, URL, page number). Content spacing is handled
  // inside each label instead.
  'A4-3':            { kind: 'label3',       page: '@page{size:A4;margin:0}',      brk: '.item:nth-of-type(3n){page-break-after:always}' },
  'A4-4':            { kind: 'label3',       page: '@page{size:A4;margin:0}',      brk: '.item:nth-of-type(4n){page-break-after:always}', compact: true },
  '8X4':             { kind: 'label3',       page: '@page{size:8in 4in;margin:0}', brk: '.item{page-break-after:always}', compact: true },
  'THERMAL-6X3':     { kind: 'thermalLandscape', page: '@page{size:6in 3in;margin:0}', brk: '.item{page-break-after:always}' },
  'THERMAL-6X4':     { kind: 'thermalLandscape', page: '@page{size:6in 4in;margin:0}', brk: '.item{page-break-after:always}' },
  'THERMAL-4X6':     { kind: 'thermal',      page: '@page{size:4in 6in;margin:0}', brk: '.item{page-break-after:always}' },
  'THERMAL-3X4':     { kind: 'thermal',      page: '@page{size:3in 4in;margin:0}', brk: '.item{page-break-after:always}' },
  'A4-LABEL-INVOICE':{ kind: 'labelInvoice', page: '@page{size:A4;margin:0}',      brk: '.item{page-break-after:always}' },
  'A4-INVOICE':      { kind: 'invoice',      page: '@page{size:A4;margin:0}',      brk: '.item{page-break-after:always}' },
};

function renderOne(kind, b, settings, assets, fmt) {
  switch (kind) {
    case 'label3':          return labelBlock3(b, settings, assets, { compact: fmt.compact });
    case 'thermal':         return thermalBlock(b, settings, assets);
    case 'thermalLandscape': return thermalLandscapeBlock(b, settings, assets);
    case 'invoice':      return invoiceBlock(b, settings, assets);
    case 'labelInvoice': return `<div class="item">${labelBlock3(b, settings, assets)}${invoiceBlock(b, settings, assets).replace('class="item inv"', 'class="inv"')}</div>`;
    default:             return labelBlock3(b, settings, assets);
  }
}

const BASE_CSS = `
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
  html, body { margin: 0; padding: 0; color: #111; }
  .item { break-inside: avoid; }
  .courier-logo img, .courier-logo svg { display: block; max-height: 38px; max-width: 150px; width: auto; object-fit: contain; }
  .courier-logo-text { font-weight: 900; font-size: 16px; }
  .brand-mark { max-height: 26px; max-width: 120px; object-fit: contain; display: block; margin-bottom: 4px; }

  /* ── Layout A: 3-column label ── */
  .lbl3 { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #000; }
  .lbl3 td { border: 1px solid #000; vertical-align: top; padding: 5px 7px; font-size: 10.5px; line-height: 1.35; }
  .lbl3 .hdr td { text-align: center; font-weight: 800; padding: 4px; }
  /* Body cells are content-height. Scope any structural sizing to the DIRECT
     body cells (child combinator) so it never cascades into the nested .pgrid
     table cells and stretches the label. */
  .lbl3 > tbody > tr.cells > td { vertical-align: top; }
  .lbl3 .cust { width: 34%; padding: 0; }
  .lbl3 .brand { width: 29%; }
  .lbl3 .parcel { width: 37%; padding: 0; }
  .lbl3 .cust .sub { padding: 5px 7px; border-bottom: 1px solid #000; }
  .lbl3 .cust .order-wrap { display: flex; justify-content: space-between; align-items: flex-start; padding: 5px 7px; }
  .lbl3 .brand .shipper-row { display: flex; justify-content: space-between; gap: 6px; }
  .lbl3 .brand .amount { text-align: center; font-size: 16px; font-weight: 800; margin-top: 12px; }
  .lbl3 .brand .amount-bc { text-align: center; margin-top: 2px; }
  .lbl3 .brand .amount-bc img { height: 26px; max-width: 90%; }
  .lbl3 .parcel .parcel-top { display: flex; justify-content: space-between; align-items: center; padding: 5px 7px; }
  .lbl3 .parcel .track { text-align: center; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px; }
  .lbl3 .parcel .track .bc { height: 34px; max-width: 96%; }
  .lbl3 .parcel .track .track-no { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
  .lbl3 .parcel .pgrid { width: 100%; border-collapse: collapse; }
  .lbl3 .parcel .pgrid td { border: none; border-top: 1px solid #000; padding: 3px 7px; font-size: 10px; }
  .lbl3 .parcel .pgrid td.r { text-align: right; }
  .lbl3 .parcel .pgrid tr:first-child td { border-top: none; }
  .bc-sm { height: 26px; max-width: 130px; margin-top: 3px; }
  .qr { width: 50px; height: 50px; object-fit: contain; }
  .foot .remarks, .foot .products { font-size: 10.5px; }
  .foot .products { min-height: 30px; }

  /* ── Layout B: vertical thermal ── */
  .thm { width: 100%; font-size: 10px; }
  .thm-top { text-align: center; }
  .thm-top .bc-top { height: 44px; max-width: 100%; }
  .thm-top .track-no { font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-top: -2px; }
  .thm-logo-row { display: flex; justify-content: space-between; align-items: center; margin: 4px 0 6px; }
  .thm-logo-row .qr { width: 46px; height: 46px; }
  .thm-box { border: 1.5px solid #000; }
  .thm-box .box-hdr { text-align: center; font-weight: 800; border-bottom: 1px solid #000; padding: 4px; font-size: 11px; }
  .thm-box .box-sec { border-bottom: 1px solid #000; padding: 5px 7px; line-height: 1.4; }
  .thm-box .cod { text-align: center; }
  .thm-box .cod .cod-amt { font-size: 15px; font-weight: 800; }
  .thm-box .cod .bc-cod { height: 26px; max-width: 70%; margin-top: 2px; }
  .thm-box .order-row { display: flex; justify-content: space-between; align-items: center; }
  .thm-box .order-row .bc-sm { margin-top: 0; }
  .pgrid2 { width: 100%; border-collapse: collapse; }
  .pgrid2 td { border-bottom: 1px solid #000; padding: 4px 7px; font-size: 10px; width: 50%; }
  .pgrid2 td:first-child { border-right: 1px solid #000; }
  .thm-box .shipper .sr { display: flex; justify-content: space-between; gap: 6px; }
  .thm-box .box-sec:last-child { border-bottom: none; }

  /* ── Layout B2: landscape thermal (6x4 / 6x3) ── */
  .thml { width: 100%; font-size: 10px; border: 1.5px solid #000; }
  .thml-grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .thml-grid td { vertical-align: top; }
  .thml-grid td:first-child { border-right: 1px solid #000; }
  .thml-grid .hdr td { text-align: center; font-weight: 800; padding: 3px; border-bottom: 1px solid #000; }
  .thml-grid .cust, .thml-grid .ship { width: 50%; }
  .thml-grid .cust .sub { border-bottom: 1px solid #000; padding: 5px 7px; line-height: 1.4; }
  .thml-grid .cust .sub:last-child { border-bottom: none; }
  .thml-grid .cust .cod { display: flex; align-items: center; gap: 8px; }
  .thml-grid .cust .cod .cod-amt { font-size: 13px; font-weight: 800; white-space: nowrap; }
  .thml-grid .cust .cod img { height: 22px; max-width: 150px; }
  .thml-grid .ship .ship-top { display: flex; justify-content: space-between; align-items: center; padding: 5px 7px; }
  .thml-grid .ship .ship-top .qr { width: 44px; height: 44px; }
  .thml-grid .ship .track { text-align: center; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px; }
  .thml-grid .ship .track .bc { height: 30px; max-width: 96%; }
  .thml-grid .ship .track .track-no { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
  .thml-grid .ship .order { padding: 6px 7px; font-size: 12px; }
  .thml-row { border-top: 1px solid #000; padding: 4px 7px; font-size: 10px; }
  .thml-row.products { min-height: 32px; }

  /* ── Layout C: invoice ── */
  .inv { width: 100%; font-size: 11px; margin-top: 0; }
  .item + .inv { margin-top: 8px; } /* gap only when invoice follows a label (A4-LABEL-INVOICE) */
  .inv-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .inv-head .inv-brand { line-height: 1.4; }
  .inv-head .inv-title { font-size: 26px; font-weight: 800; }
  .inv3 { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #000; }
  .inv3 td { vertical-align: top; padding: 8px 10px; line-height: 1.5; }
  .inv3 .ic-cust { width: 40%; border-right: 1px solid #000; }
  .inv3 .ic-mid { width: 27%; border-right: 1px solid #000; text-align: center; }
  .inv3 .ic-mid .order { font-size: 14px; font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 4px; }
  .inv3 .ic-mid .bc { height: 30px; max-width: 90%; }
  .inv3 .ic-mid .sp { text-align: left; }
  .inv3 .ic-cour { width: 33%; }
  .inv3 .ih { font-weight: 800; font-size: 13px; margin-bottom: 6px; }
  .inv3 .sp { margin-top: 6px; }
  .inv3 .ic-cour .bc { height: 34px; max-width: 100%; margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; width: 100%; }
  .inv-items { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .inv-items th, .inv-items td { border: 1px solid #000; padding: 5px 8px; text-align: left; font-size: 11px; }
  .inv-items .qty { width: 8%; } .inv-items .sku { width: 22%; } .inv-items .price { width: 14%; }
  .inv-items .ih th { font-weight: 800; }
  .inv-totals { border-collapse: collapse; margin-top: 12px; margin-left: auto; width: 40%; }
  .inv-totals td { border: 1px solid #000; padding: 5px 10px; font-size: 11px; }
  .inv-totals td:first-child { font-weight: 700; width: 60%; }

  @media screen { body { background: #e5e7eb; padding: 16px; } .item { background: #fff; padding: 10px; margin-bottom: 14px; } }
  /* Print: hug the top-left corner, no centering / extra whitespace. */
  @media print { html, body { margin: 0 !important; padding: 0 !important; } body { text-align: left; } .item:first-child { margin-top: 0 !important; } }
`;

/**
 * Build the full HTML document and open a print window.
 * @param {Object[]} bookings  rows from /api/bookings
 * @param {Object}   settings  shop_settings row (logo_data, shipper_*, label_size)
 */
export async function printCustomLabels(bookings, settings = {}) {
  if (!bookings || bookings.length === 0) return;
  const size = settings.label_size || 'A4-3';
  const fmt = FORMATS[size] || FORMATS['A4-3'];

  await ensureLibs();

  const blocks = bookings.map((b) => {
    const assets = {
      track: barcodeDataUrl(b.tracking_number, { height: 40, width: 1.5 }),
      trackTall: barcodeDataUrl(b.tracking_number, { height: 55, width: 1.6 }),
      order: barcodeDataUrl(b.order_id, { height: 28, width: 1.2 }),
      qr: qrDataUrl(b.tracking_number),
      logo: courierLogoSvg(b.courier),
    };
    return renderOne(fmt.kind, b, settings, assets, fmt);
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Labels</title>
  <style>
    ${fmt.page}
    ${fmt.brk || ''}
    ${BASE_CSS}
  </style></head>
  <body onload="setTimeout(function(){ window.focus(); window.print(); }, 350)">
    ${blocks.join('\n')}
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to print labels.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
