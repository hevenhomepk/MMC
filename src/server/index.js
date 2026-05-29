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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
