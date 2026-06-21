// src/server/index.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../../dist')));
function authMiddleware(req, res, next) {
  // TODO: verify Shopify session JWT
  next();
}

app.use('/api/tcs', authMiddleware, require('./routes/tcs'));
app.use('/api/postex', authMiddleware, require('./routes/postex'));
app.use('/api/bookings', authMiddleware, require('./routes/bookings'));
app.use('/api/loadsheets', authMiddleware, require('./routes/loadsheets'));
app.use('/api/returns', authMiddleware, require('./routes/returns'));
app.use('/api/analytics', authMiddleware, require('./routes/analytics'));
app.use('/api/shopify', authMiddleware, require('./routes/shopify'));
app.use('/api/webhook', authMiddleware, require('./routes/webhook'));

// Fallback for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);

// ── Graceful error handling ──────────────────────────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.\n`);
    console.error(`   Run one of these to free it, then restart:\n`);
    console.error(`   fuser -k ${PORT}/tcp`);
    console.error(`   lsof -i :${PORT}  →  then:  kill -9 <PID>\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

// ── Graceful shutdown (frees the port cleanly on Ctrl+C / SIGTERM) ──────────
const shutdown = (signal) => {
  console.log(`\n🛑 ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed. Port released.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGUSR2', () => shutdown('SIGUSR2'));
