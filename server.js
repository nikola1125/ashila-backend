require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      ? connectionString + 'medi-mart' 
      : connectionString + '/medi-mart';
  }
}

mongoose.connect(connectionString, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
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

// Routes
app.use('/users', require('./routes/users'));
app.use('/categories', require('./routes/categories'));
app.use('/medicines', require('./routes/products'));
app.use('/products', require('./routes/products'));
app.use('/orders', require('./routes/orders'));
app.use('/reviews', require('./routes/reviews'));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API Base URL: http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});
