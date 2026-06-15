require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();

// Behind a proxy (Render/Cloudflare) so rate limiting and secure cookies work correctly
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Use compression middleware for smaller payloads
app.use(compression());

// Lightweight request logger (no bodies, no tokens, no PII)
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// CORS — strict allowlist
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://medimart-two.vercel.app',
  'https://www.farmaciashila.com',
  'https://farmaciashila.com',
  'http://localhost:5174',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Strip MongoDB operators from untrusted input (NoSQL injection protection)
const { mongoSanitize } = require('./middleware/sanitize');
app.use(mongoSanitize);

// Global rate limiter — protects against abuse/DoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Connect to MongoDB with resilience
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error', err.message);
    // Retry after a delay rather than running without a database
    setTimeout(connectDB, 5000);
  }
};
connectDB();

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
  logger.error(err.message, process.env.NODE_ENV === 'development' ? err.stack : undefined);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const BASE_URL = process.env.NODE_ENV === 'production'
  ? (process.env.BASE_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app.onrender.com'}`)
  : `http://localhost:${PORT}`;

const server = app.listen(PORT, HOST, () => {
  logger.info(`Server running on ${BASE_URL}`);
  logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown and crash safety
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    mongoose.connection.close(false).finally(() => process.exit(0));
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err.message);
});
