const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    freeDelivery: {
        type: Boolean,
        default: false,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Settings', settingsSchema);
