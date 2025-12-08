const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  photoURL: String,
  role: {
    type: String,
    enum: ['user', 'seller', 'admin'],
    default: 'user'
  },
  phoneNumber: String,
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
