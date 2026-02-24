const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure VAPID lazily — won't crash if keys are missing
let vapidReady = false;
const initVapid = () => {
    if (vapidReady) return true;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'admin@farmaciashila.com';
    if (!pub || !priv) return false;
    try {
        webpush.setVapidDetails(`mailto:${email}`, pub, priv);
        vapidReady = true;
        return true;
    } catch (e) {
        console.error('[Push] VAPID init error:', e.message);
        return false;
    }
};
initVapid();

// GET /push/vapid-public-key — frontend fetches this to subscribe
router.get('/vapid-public-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.status(503).json({ message: 'Push not configured' });
    res.json({ publicKey: key });
});

// GET /push/status — diagnostic
router.get('/status', async (req, res) => {
    const ready = initVapid();
    const count = await PushSubscription.countDocuments().catch(() => 0);
    res.json({
        pushConfigured: ready,
        subscriptions: count,
        message: ready
            ? `Push ready. ${count} device(s) subscribed.`
            : 'VAPID keys missing on Render. Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL.'
    });
});

// POST /push/subscribe — admin device saves subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { endpoint, keys, userAgent } = req.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }
        await PushSubscription.findOneAndUpdate(
            { endpoint },
            { endpoint, keys, userAgent: userAgent || '' },
            { upsert: true, new: true }
        );
        const count = await PushSubscription.countDocuments();
        console.log(`[Push] Device subscribed. Total: ${count}`);
        res.status(201).json({ message: 'Subscribed' });
    } catch (err) {
        console.error('[Push] Subscribe error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// POST /push/unsubscribe
router.post('/unsubscribe', async (req, res) => {
    try {
        await PushSubscription.deleteOne({ endpoint: req.body.endpoint });
        res.json({ message: 'Unsubscribed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /push/test — send test push to all devices
router.post('/test', async (req, res) => {
    if (!initVapid()) {
        return res.status(503).json({
            message: 'VAPID keys not set. Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL to Render environment.'
        });
    }
    const result = await sendPushToAdmins({
        title: '🔔 Test — Farmaci Ashila',
        body: 'Push is working!',
        url: '/admin/orders'
    });
    res.json(result || { message: 'Test sent' });
});

module.exports = router;

// Helper used by orders.js
const sendPushToAdmins = async (payload) => {
    if (!initVapid()) return;
    try {
        const subs = await PushSubscription.find();
        if (!subs.length) return;

        const msg = JSON.stringify(payload);
        const stale = [];

        await Promise.allSettled(subs.map(async (sub) => {
            try {
                await webpush.sendNotification(sub, msg);
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    stale.push(sub.endpoint);
                } else {
                    console.error('[Push]', err.statusCode, err.message);
                }
            }
        }));

        if (stale.length) {
            await PushSubscription.deleteMany({ endpoint: { $in: stale } });
            console.log(`[Push] Removed ${stale.length} stale subscription(s)`);
        }
        return { sent: subs.length - stale.length, total: subs.length };
    } catch (err) {
        console.error('[Push] sendPushToAdmins error:', err.message);
    }
};

module.exports.sendPushToAdmins = sendPushToAdmins;
