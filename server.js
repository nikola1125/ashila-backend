
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
// Enhanced CORS for mobile and multiple origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, '')) // Remove trailing slashes
  : [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ashilafarmaci.netlify.app' // Production Netlify domain
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

// Routes
app.use('/users', require('./routes/users'));
app.use('/categories', require('./routes/categories'));
app.use('/medicines', require('./routes/products'));
app.use('/products', require('./routes/products'));
app.use('/orders', require('./routes/orders'));
app.use('/reviews', require('./routes/reviews'));
app.use('/admin', require('./routes/adminAuth'));
app.use('/settings', require('./routes/settings'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// DEBUG EMAIL ENDPOINT
// DEBUG EMAIL ENDPOINT (MAILJET)
app.get('/debug-email', async (req, res) => {
  const Mailjet = require('node-mailjet');
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const senderEmail = process.env.MAILJET_SENDER_EMAIL;

  if (!apiKey || !secretKey || !senderEmail) {
    return res.status(500).json({
      success: false,
      message: 'Missing Mailjet Environment Variables!',
      env: {
        MAILJET_API_KEY_EXISTS: !!apiKey,
        MAILJET_SECRET_KEY_EXISTS: !!secretKey,
        MAILJET_SENDER_EMAIL: senderEmail || 'missing'
      }
    });
  }

  const mailjet = Mailjet.apiConnect(apiKey, secretKey);

  try {
    const result = await mailjet
      .post("send", { 'version': 'v3.1' })
      .request({
        "Messages": [
          {
            "From": {
              "Email": senderEmail,
              "Name": "Farmaci Ashila Debug"
            },
            "To": [
              {
                "Email": senderEmail, // Send to sender for safety/verification
                "Name": "Admin"
              }
            ],
            "Subject": "Mailjet Integration Success - Farmaci Ashila",
            "TextPart": "If you are reading this, your Render backend is successfully connected to Mailjet!",
            "HTMLPart": "<h3>Mailjet Works!</h3><p>Your backend can now send emails without SMTP blocking.</p>",
          }
        ]
      });

    res.json({ success: true, message: 'Email sent successfully via Mailjet!', data: result.body });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mailjet API Error',
      statusCode: error.statusCode,
      errorMessage: error.message,
      details: error.response ? error.response.body : 'No details'
    });
  }
});

// DEBUG NETWORK ENDPOINT
app.get('/debug-network', async (req, res) => {
  const dns = require('dns');
  const net = require('net');

  const results = {
    timestamp: new Date().toISOString(),
    host: 'smtp.gmail.com',
    dns: { status: 'pending' },
    ports: {
      587: { status: 'pending' },
      465: { status: 'pending' }
    }
  };

  try {
    // 1. DNS Lookup
    await new Promise((resolve) => {
      dns.resolve('smtp.gmail.com', (err, addresses) => {
        if (err) {
          results.dns = { status: 'failed', error: err.message };
        } else {
          results.dns = { status: 'success', addresses };
        }
        resolve();
      });
    });

    // 2. TCP Connection Test Helper
    const checkPort = (port) => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000); // 3s timeout

        socket.on('connect', () => {
          results.ports[port] = { status: 'open' };
          socket.destroy();
          resolve();
        });

        socket.on('timeout', () => {
          results.ports[port] = { status: 'timeout' };
          socket.destroy();
          resolve();
        });

        socket.on('error', (err) => {
          results.ports[port] = { status: 'closed', error: err.message };
          socket.destroy();
          resolve();
        });

        socket.connect(port, 'smtp.gmail.com');
      });
    };

    // 3. Run Port Checks
    await Promise.all([checkPort(587), checkPort(465)]);

    res.json(results);

  } catch (error) {
    res.status(500).json({
      error: 'Diagnostic tool failed',
      details: error.message,
      stack: error.stack
    });
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
