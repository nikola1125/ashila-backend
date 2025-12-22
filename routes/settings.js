const express = require('express');
const Settings = require('../models/Settings');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get settings (Protected but accessible to authenticated users for checkout)
// Actually, it should be public for checkout if users can checkout as guests?
// The prompt implies "check it", let's make it public for reading, protected for writing.
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({ freeDelivery: false });
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update settings (Admin only)
router.patch('/', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const { freeDelivery } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({ freeDelivery: false });
        }

        if (freeDelivery !== undefined) {
            settings.freeDelivery = freeDelivery;
        }

        settings.updatedAt = Date.now();
        await settings.save();

        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
