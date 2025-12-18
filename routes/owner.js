const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/check', requireAuth, async (req, res) => {
  try {
    const ownerPhone = process.env.OWNER_PHONE;
    if (!ownerPhone) {
      return res.status(500).json({ message: 'OWNER_PHONE is not configured on server' });
    }

    const tokenPhone = req.user?.phone_number;
    if (!tokenPhone) {
      return res.status(403).json({ message: 'Phone auth required' });
    }

    if (tokenPhone !== ownerPhone) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json({ ok: true, phone: tokenPhone });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to verify owner' });
  }
});

module.exports = router;
