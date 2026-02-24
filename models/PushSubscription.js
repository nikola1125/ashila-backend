const mongoose = require('mongoose');

// Stores Web Push subscriptions (endpoint + encryption keys) per admin device
const pushSubscriptionSchema = new mongoose.Schema({
    endpoint: { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
