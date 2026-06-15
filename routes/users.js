const express = require('express');
const User = require('../models/User');
const { requireAuth, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const router = express.Router();

// Fields a normal user is allowed to modify on their own profile
const USER_EDITABLE_FIELDS = ['name', 'photoURL', 'phoneNumber', 'address'];
// Fields an admin may additionally modify
const ADMIN_EDITABLE_FIELDS = [...USER_EDITABLE_FIELDS, 'role', 'isVerified'];

const pick = (obj, fields) => {
  const out = {};
  for (const f of fields) {
    if (obj[f] !== undefined) out[f] = obj[f];
  }
  return out;
};

// Get all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user role (used by frontend hook)
router.get('/role', requireAuth, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'email query parameter is required' });
    }

    const requesterEmail = req.user?.email;
    const isAdmin = req.user?.typ === 'admin' || req.user?.admin === true;

    // Only allow querying your own role unless requester is admin
    if (!isAdmin && requesterEmail !== email) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await User.findOne({ email }).select('role email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ role: user.role });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get role' });
  }
});

// Get user by email (self or admin only)
router.get('/:email', requireAuth, requireSelfOrAdmin((req) => req.params.email), async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user (called right after Firebase signup; role is always forced to 'user')
router.post('/', requireAuth, async (req, res) => {
  // The email must match the authenticated Firebase user to prevent spoofing
  const authEmail = (req.user?.email || '').toLowerCase();
  const bodyEmail = (req.body.email || '').toLowerCase();
  if (!authEmail || authEmail !== bodyEmail) {
    return res.status(403).json({ message: 'Email does not match authenticated user' });
  }

  try {
    const existing = await User.findOne({ email: bodyEmail });
    if (existing) {
      return res.status(200).json(existing);
    }

    const user = new User({
      email: bodyEmail,
      name: req.body.name,
      photoURL: req.body.photoURL || null,
      role: 'user' // Always 'user' — no role selection during signup
    });
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update own profile (self or admin); only whitelisted fields
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isAdmin = req.user?.typ === 'admin' || req.user?.admin === true;
    const isOwner = (req.user?.email || '').toLowerCase() === (user.email || '').toLowerCase();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updates = pick(req.body, isAdmin ? ADMIN_EDITABLE_FIELDS : USER_EDITABLE_FIELDS);
    Object.assign(user, updates);
    user.updatedAt = Date.now();
    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
