const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  imgUrl: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sellerEmail: String,
  isActive: {
    type: Boolean,
    default: false
  },
  startDate: Date,
  endDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Ad', adSchema);
