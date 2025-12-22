const firebaseAdmin = require('../services/firebaseAdmin');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const tryVerifyAdminJwt = (token) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret, { issuer: 'medi-mart' });
    if (decoded?.typ !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
};

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    // 1) Try admin JWT (username/password login)
    console.log('[Auth URL]', req.originalUrl); // Debug: Print which URL is being accessed
    console.log('[Auth Token]', token.substring(0, 20) + '...'); // Debug: Print first 20 chars of token

    const adminDecoded = tryVerifyAdminJwt(token);
    if (adminDecoded) {
      console.log('[Auth Success] Admin JWT verified. User:', adminDecoded);
      // FIX: Spread adminDecoded to ensure 'email' and other payload fields are passed to req.user
      req.user = { ...adminDecoded, admin: true };
      return next();
    } else {
      console.log('[Auth Info] Admin JWT verification failed or not an admin token. Falling back to Firebase.');
    }

    // 2) Fallback to Firebase ID token (normal users)
    if (!firebaseAdmin) {
      console.log('[Auth Error] Firebase Admin not configured.');
      return res.status(500).json({ message: 'Auth is not configured on server' });
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    console.log('[Auth Success] Firebase Token verified. User Email:', decoded.email);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('[Auth Failed] Token verification error:', err.message);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    // Strict separation: Only allow users effectively logged in via Admin Credentials
    // (verified by the presence of 'typ: "admin"' in the JWT)
    if (req.user?.typ === 'admin') {
      console.log('[Auth Debug] Admin Access GRANTED (Credential Auth).');
      return next();
    }

    console.log('[Auth Debug] Admin Access DENIED (Invalid Token Type).');
    return res.status(403).json({ message: 'Forbidden: Admin Credentials Required' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to authorize user' });
  }
};

const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (req.user?.admin === true) {
        return next();
      }

      const email = req.user?.email;
      if (!email) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const user = await User.findOne({ email }).select('role email');
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.appUser = user;
      return next();
    } catch (err) {
      return res.status(500).json({ message: 'Failed to authorize user' });
    }
  };
};

module.exports = { requireAuth, requireAdmin, requireRole };
