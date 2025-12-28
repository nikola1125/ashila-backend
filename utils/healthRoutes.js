const express = require('express');
const router = express.Router();

// Simple health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Lightweight keep-alive endpoint
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'pong', timestamp: Date.now() });
});

module.exports = router;
