const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const router = express.Router();

const safeEqual = (a, b) => {
  const aBuf = Buffer.from(String(a || ''), 'utf8');
  const bBuf = Buffer.from(String(b || ''), 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body || {};

    const adminUsername = (process.env.ADMIN_USERNAME || '').trim();
    const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminUsername || !adminPassword) {
      return res.status(500).json({ message: 'Admin credentials are not configured on server' });
    }

    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
    }

    const inputUsername = String(username || '').trim();
    const inputPassword = String(password || '').trim();

    if (!safeEqual(inputUsername, adminUsername) || !safeEqual(inputPassword, adminPassword)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const remember = Boolean(rememberMe);
    const expiresIn = remember ? '7d' : '12h';

    const token = jwt.sign(
      {
        typ: 'admin',
        email: 'nikolahaxhi78@gmail.com' // Hardcoded to match the strict owner requirement
      },
      jwtSecret,
      { expiresIn, issuer: 'medi-mart' }
    );

    return res.json({ token, expiresIn });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to login' });
  }
});

router.get('/check', async (req, res) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
    }

    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const decoded = jwt.verify(token, jwtSecret, { issuer: 'medi-mart' });
    if (decoded?.typ !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

module.exports = router;
