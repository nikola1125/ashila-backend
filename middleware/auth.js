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
    const adminDecoded = tryVerifyAdminJwt(token);
    if (adminDecoded) {
      req.user = { admin: true, typ: 'admin' };
      return next();
    }

    // 2) Fallback to Firebase ID token (normal users)
    if (!firebaseAdmin) {
      return res.status(500).json({ message: 'Auth is not configured on server' });
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (req.user?.admin === true) {
      return next();
    }

    const email = req.user?.email;
    if (!email) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await User.findOne({ email }).select('role email');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.appUser = user;
    return next();
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
