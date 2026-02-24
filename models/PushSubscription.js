const mongoose = require('mongoose');

// Stores FCM tokens for admin devices — one token per device
const pushSubscriptionSchema = new mongoose.Schema({
    // FCM device token (replaces the old web-push endpoint/keys)
    fcmToken: { type: String, required: true, unique: true },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
