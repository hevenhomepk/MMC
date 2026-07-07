// scratch/test-tracking.js
// Exercises the tracking API call + status derivation + Shopify-event mapping.
// DB is not required for these functions.
const tcs = require('../src/server/services/tcsService');

// A fabricated response identical in shape to the documented GetDynamicTrackDetail
// success payload, used to validate deriveStatus / grouping without a live CN.
const sample = {
  shipmentinfo: [{ consignmentno: '779412326902', bookingdate: 'Oct 14, 2024', origin: 'LAHORE', destination: 'BAGH' }],
  deliveryinfo: [
    { consignmentno: '779412326902', station: 'BAGH', datetime: 'Thursday Oct 17, 2024 12:58', recievedby: 'IMROOZ', status: 'Delivered', code: 'OK', allowshow: 'Y' },
    { consignmentno: '779412326902', station: 'BAGH', datetime: 'Wednesday Oct 16, 2024 11:58', recievedby: null, status: 'Awaiting Receiver Collection', code: 'SC', allowshow: 'Y' },
  ],
  checkpoints: [
    { consignmentno: '779412326902', datetime: 'Thursday Oct 17, 2024 12:58', recievedby: 'IMROOZ', status: 'Shipment Delivered' },
    { consignmentno: '779412326902', datetime: 'Monday    Oct 14, 2024 23:19', recievedby: 'LAHORE', status: 'Arrived at TCS Facility' },
  ],
  shipmentsummary: 'Current Status: DELIVERED',
};

// deriveStatus consumes a grouped-per-CN record; build one the way the service does.
const perCn = { shipmentinfo: sample.shipmentinfo[0], deliveryinfo: sample.deliveryinfo, checkpoints: sample.checkpoints, shipmentsummary: sample.shipmentsummary };

console.log('--- parseTrackDate ---');
console.log('weekday+spaces:', tcs.parseTrackDate('Monday    Oct 14, 2024 23:19'));
console.log('normal:', tcs.parseTrackDate('Thursday Oct 17, 2024 12:58'));

console.log('\n--- deriveStatus (delivered, latest deliveryinfo wins) ---');
console.log(tcs.deriveStatus(perCn));

console.log('\n--- deriveStatus (no deliveryinfo → latest checkpoint) ---');
console.log(tcs.deriveStatus({ ...perCn, deliveryinfo: [] }));

console.log('\n--- normalizeStatusToShopifyEvent ---');
for (const [s, c] of [['Delivered', 'OK'], ['Out For Delivery', ''], ['Awaiting Receiver Collection', 'SC'], ['Arrived at TCS Facility', ''], ['Return to Shipper', ''], ['Booked', '']]) {
  console.log(`${s} / ${c} ->`, tcs.normalizeStatusToShopifyEvent(s, c));
}

console.log('\n--- live trackConsignments (sandbox; expect No Data Found for this CN) ---');
tcs.trackConsignments(['779412326902', '000000000000'])
  .then(map => {
    for (const [cn, v] of map) console.log(cn, '=>', v.notFound ? 'NOT FOUND' : tcs.deriveStatus(v));
  })
  .catch(e => console.error('live call error:', e.message))
  .finally(() => process.exit(0));
