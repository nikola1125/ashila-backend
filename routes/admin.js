const express = require('express');
const router = express.Router();
// Use Booking model if you have it, or remove if unused. Assuming basic logic for now.
// const Booking = require('../models/Booking'); 

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-fallback-secret-token';

// Admin Login
router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    // Simple hardcoded check for demo purposes. 
    // In production, use DB config or environment variables for secure credentials.
    if (username === 'admin' && password === 'admin123') {
        return res.json({ token: ADMIN_TOKEN });
    }
    return res.status(401).json({ message: 'Invalid credentials' });
});

// Admin Token Check
router.get('/auth/check', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, message: 'No token' });
    }
    const token = authHeader.split(' ')[1];
    if (token === ADMIN_TOKEN) {
        return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, message: 'Invalid token' });
});

module.exports = router;