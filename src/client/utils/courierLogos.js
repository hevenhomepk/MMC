// src/client/utils/courierLogos.js
// Inline (self-contained) courier-company logos for the app-rendered "custom" CN
// labels. The print window is opened via window.open('')+document.write, which has
// no base URL, so external/relative image sources cannot be relied upon — every
// logo here is inline SVG markup that renders without any network request.
//
// These are brand-approximate marks (recreated as SVG text/shapes) so labels stay
// self-contained; swap in the couriers' official artwork if exact logos are required.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// TCS — red italic wordmark with a leading chevron/swoosh.
const TCS_SVG = `
<svg viewBox="0 0 104 32" width="104" height="32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TCS">
  <polygon points="0,3 26,3 13,27" fill="#e2231a"/>
  <polygon points="8,3 22,3 15,16" fill="#ffffff"/>
  <text x="30" y="25" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-style="italic" font-size="25" letter-spacing="0.5" fill="#e2231a">TCS</text>
</svg>`;

// PostEx — bold black wordmark with a teal dot.
const POSTEX_SVG = `
<svg viewBox="0 0 132 30" width="132" height="30" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PostEx">
  <text x="0" y="24" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="27" fill="#111111">PostEx</text>
  <circle cx="122" cy="22" r="4" fill="#12b3a6"/>
</svg>`;

// Map of known couriers → inline SVG.
const LOGOS = {
  TCS: TCS_SVG,
  POSTEX: POSTEX_SVG,
};

/**
 * Return inline HTML for a courier's logo, sized to fit the label logo slot.
 * Unknown couriers fall back to a bold text badge of the courier name.
 * @param {string} courier  booking.courier (e.g. "TCS", "PostEx")
 * @returns {string} HTML string (inline SVG or text badge)
 */
export function courierLogoSvg(courier) {
  const key = String(courier || '').toUpperCase().replace(/[^A-Z]/g, '');
  const svg = LOGOS[key];
  if (svg) return `<span class="courier-logo">${svg}</span>`;
  const name = esc(courier || '');
  return `<span class="courier-logo courier-logo-text">${name}</span>`;
}
