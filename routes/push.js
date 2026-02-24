const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/PushSubscription');

// Use Firebase Admin SDK for sending (already configured in the project)
const getFirebaseAdmin = () => require('../services/firebaseAdmin');

// GET /push/status — diagnostic endpoint
router.get('/status', async (req, res) => {
    try {
        const admin = getFirebaseAdmin();
        const count = await PushSubscription.countDocuments();
        res.json({
            firebaseConfigured: !!admin,
            subscriptions: count,
            message: admin
                ? `FCM push is ready. ${count} device(s) subscribed.`
                : 'Firebase Admin not configured — check FIREBASE_* env vars on Render.'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /push/subscribe — admin device registers its FCM token
router.post('/subscribe', async (req, res) => {
    try {
        const { fcmToken, userAgent } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ message: 'fcmToken is required' });
        }

        await PushSubscription.findOneAndUpdate(
            { fcmToken },
            { fcmToken, userAgent: userAgent || '' },
            { upsert: true, new: true }
        );

        const count = await PushSubscription.countDocuments();
        console.log(`[Push] FCM token registered. Total devices: ${count}`);
        res.status(201).json({ message: 'FCM token saved' });
    } catch (err) {
        console.error('Push subscribe error:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /push/unsubscribe — remove FCM token
router.post('/unsubscribe', async (req, res) => {
    try {
        const { fcmToken } = req.body;
        await PushSubscription.deleteOne({ fcmToken });
        res.json({ message: 'Token removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /push/test — send a test notification to all subscribed devices
router.post('/test', async (req, res) => {
    const result = await sendPushToAdmins({
        title: '🔔 Test — Farmaci Ashila',
        body: 'Push notifications are working!',
        url: '/admin/orders'
    });
    res.json(result || { message: 'Test sent' });
});

module.exports = router;

// ─── Helper used by orders.js ─────────────────────────────────────────────────
const sendPushToAdmins = async (payload) => {
    const admin = getFirebaseAdmin();
    if (!admin) {
        console.warn('[Push] Firebase Admin not configured — skipping push');
        return;
    }

    try {
        const subs = await PushSubscription.find();
        if (!subs.length) {
            console.log('[Push] No subscribed devices');
            return;
        }

        const tokens = subs.map(s => s.fcmToken);
        const message = {
            notification: {
                title: payload.title,
                body: payload.body
            },
            data: {
                url: payload.url || '/admin/orders',
                title: payload.title,
                body: payload.body
            },
            tokens  // Use sendEachForMulticast for multiple devices
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[Push] Sent: ${response.successCount}/${tokens.length}`);

        // Clean up invalid/expired tokens
        const staleTokens = [];
        response.responses.forEach((r, idx) => {
            if (!r.success) {
                const code = r.error?.code;
                if (code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/registration-token-not-registered') {
                    staleTokens.push(tokens[idx]);
                } else {
                    console.error('[Push] Send error:', r.error?.message);
                }
            }
        });

        if (staleTokens.length) {
            await PushSubscription.deleteMany({ fcmToken: { $in: staleTokens } });
            console.log(`[Push] Cleaned up ${staleTokens.length} invalid token(s)`);
        }

        return { sent: response.successCount, total: tokens.length };
    } catch (err) {
        console.error('[Push] sendPushToAdmins error:', err.message);
    }
};

module.exports.sendPushToAdmins = sendPushToAdmins;
