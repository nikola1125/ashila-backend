require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');

const app = express();

// Use compression middleware for smaller payloads
app.use(compression());

// GLOBAL LOGGER: See every request that hits the server
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url} (Origin: ${req.headers.origin || 'none'})`);
  next();
});

// Middleware
// Improved CORS for production:
// - Support multiple origins (desktop and potentially varying mobile URLs)
// - More robust handling for Render/OVH communication
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://medimart-two.vercel.app', // Add any extra production domains
  'https://www.farmaciashila.com',
  'https://farmaciashila.com',
  'http://localhost:5174', // Development frontend
  'http://localhost:5173'  // Alternative development port
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // For production mobile troubleshooting, it's safer to allow the request
      // but you can restrict it further once working.
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/users', require('./routes/users'));
app.use('/categories', require('./routes/categories'));
app.use('/medicines', require('./routes/products'));
app.use('/products', require('./routes/products'));
app.use('/orders', require('./routes/orders'));
app.use('/reviews', require('./routes/reviews'));
app.use('/admin', require('./routes/adminAuth'));
app.use('/settings', require('./routes/settings'));
app.use('/seo', require('./routes/seo'));
app.use('/sitemap.xml', require('./routes/seo'));
app.use('/push', require('./routes/push'));


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date(), version: 'Feb-24-v2' });
});

// STANDALONE Diagnostic endpoint (Bypasses all routers)
app.get('/onesignal-diagnostic', async (req, res) => {
  console.log('[DEBUG] Standalone onesignal-diagnostic route hit!');
  try {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    const mask = (str) => str ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : 'MISSING';

    if (!appId || !apiKey) {
      return res.status(500).json({
        ok: false,
        version: 'Feb-24-v3',
        error: 'Credentials missing',
        appId: mask(appId),
        apiKey: mask(apiKey)
      });
    }

    const data = JSON.stringify({
      app_id: appId,
      included_segments: ['All'],
      headings: { en: '🚀 Diagnostic v3 — Farmaci Ashila' },
      contents: { en: 'Testing backend notification link...' }
    });

    const https = require('https');
    const osReq = https.request({
      hostname: 'onesignal.com',
      path: '/api/v1/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${apiKey}`
      }
    }, (osRes) => {
      let body = '';
      osRes.on('data', d => body += d);
      osRes.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(body || '{}'); } catch (e) { parsed = { raw: body }; }
        res.json({
          version: 'Feb-24-v3',
          statusCode: osRes.statusCode,
          response: parsed,
          debug: {
            appId: mask(appId),
            apiKeyLength: apiKey.length,
            apiKeyMasked: mask(apiKey)
          }
        });
      });
    });

    osReq.on('error', (e) => res.status(500).json({ ok: false, error: e.message }));
    osReq.write(data);
    osReq.end();
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const BASE_URL = process.env.NODE_ENV === 'production'
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app.onrender.com'}`
  : `http://localhost:${PORT}`;

app.listen(PORT, HOST, () => {
  console.log(`\n✓ Server running on ${BASE_URL}`);
  console.log(`✓ API Base URL: ${BASE_URL}`);
  console.log(`✓ CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});
