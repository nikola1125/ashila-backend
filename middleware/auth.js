const firebaseAdmin = require('../services/firebaseAdmin');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const tryVerifyAdminJwt = (token) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[Auth] JWT_SECRET not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, { issuer: 'medi-mart' });
    if (decoded?.typ !== 'admin') {
      return null;
    }
    return decoded;
  } catch (err) {
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
      req.user = { ...adminDecoded, admin: true };
      return next();
    }

    // 2) Fallback to Firebase ID token (normal users)
    if (!firebaseAdmin) {
      console.error('[Auth] Firebase Admin not configured.');
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
    // Strict separation: only allow users logged in via Admin Credentials
    // (verified by the presence of 'typ: "admin"' in the JWT)
    if (req.user?.typ === 'admin') {
      return next();
    }
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

// Ensures the authenticated requester is either an admin or the owner of `email`.
// `getEmail` extracts the target email from the request (params/query/body).
const requireSelfOrAdmin = (getEmail) => {
  return (req, res, next) => {
    if (req.user?.typ === 'admin' || req.user?.admin === true) {
      return next();
    }
    const targetEmail = (getEmail(req) || '').toLowerCase();
    const requesterEmail = (req.user?.email || '').toLowerCase();
    if (targetEmail && requesterEmail && targetEmail === requesterEmail) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
  };
};

module.exports = { requireAuth, requireAdmin, requireRole, requireSelfOrAdmin };
