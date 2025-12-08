const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    date: { type: Date, required: true },
    service: { type: String, default: 'consult' },
    notes: { type: String },
    calendarEventId: { type: String },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);