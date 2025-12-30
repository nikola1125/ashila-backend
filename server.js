
require('dotenv').config();
// Force redeploy - 2025-12-30
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const SimpleCache = require('./utils/cache');
const healthRoutes = require('./utils/healthRoutes');

const app = express();

// Initialize cache
const cache = new SimpleCache(5 * 60 * 1000); // 5 minutes

// Make cache available globally
app.locals.cache = cache;

// If behind a proxy/load balancer (Render/NGINX), enable correct IP detection
app.set('trust proxy', 1);

// Middleware
// Enhanced CORS for mobile and multiple origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, '')) // Remove trailing slashes
  : [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ashilafarmaci.netlify.app', // Production Netlify domain
    'https://www.farmaciashila.com' // OVH domain
  ];

app.use(cors({
  origin: true, // Allow all origins for now to fix the issue definitively
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Access-Control-Allow-Credentials']
}));

// Body parsing with mobile-friendly limits
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for mobile
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const ordersLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Ensure database name is included in the connection string
let connectionString = MONGODB_URI.trim();
if (!connectionString.endsWith('/') && !connectionString.includes('?')) {
  // Add database name if not present
  if (!connectionString.match(/\/[^\/\?]+(\?|$)/)) {
    connectionString = connectionString.endsWith('/')
      ? connectionString + 'test'
      : connectionString + '/test';
  }
}

mongoose.connect(connectionString, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  maxPoolSize: 50, // Maintain up to 50 socket connections
  minPoolSize: 5, // Maintain at least 5 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
  retryWrites: true, // Retry write operations on network errors
})
  .then(() => {
    console.log('✓ MongoDB connected successfully');
    console.log(`✓ Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Please check:');
    console.error('   1. MONGODB_URI in .env file is correct');
    console.error('   2. MongoDB Atlas cluster is running');
    console.error('   3. IP address is whitelisted in MongoDB Atlas');
    console.error('   4. Username and password are correct');
    process.exit(1);
  });

// Health check routes (very lightweight)
app.use('/api', healthRoutes);

// API Routes
app.use('/users', require('./routes/users'));
app.use('/categories', require('./routes/categories'));
app.use('/medicines', require('./routes/products'));
app.use('/products', require('./routes/products'));
app.use('/orders', ordersLimiter, require('./routes/orders'));
app.use('/reviews', require('./routes/reviews'));
app.use('/admin', adminLimiter, require('./routes/adminAuth'));
app.use('/settings', require('./routes/settings'));
app.use('/email', require('./routes/email'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.NODE_ENV === 'production'
    ? process.env.RENDER_EXTERNAL_URL || `https://your-service.onrender.com`
    : `localhost:${PORT}`;

  console.log(`\n✓ Server running on ${protocol}://${host}`);
  console.log(`✓ API Base URL: ${protocol}://${host}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ CORS enabled for:`);
  allowedOrigins.forEach(origin => {
    console.log(`   - ${origin}`);
  });
  console.log('');
});
