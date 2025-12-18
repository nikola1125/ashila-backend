const express = require('express');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

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
    if (!requesterEmail) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Only allow querying your own role unless requester is admin
    if (requesterEmail !== email) {
      const requester = await User.findOne({ email: requesterEmail }).select('role');
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
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

// Get user by email
router.get('/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  const user = new User({
    email: req.body.email,
    name: req.body.name,
    photoURL: req.body.photoURL || null,
    role: 'user' // Always set to 'user' - no role selection during signup
  });

  try {
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update user
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    Object.assign(user, req.body);
    user.updatedAt = Date.now();
    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete user
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
