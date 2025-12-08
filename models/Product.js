const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true
  },
  genericName: String,
  company: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  categoryName: String,
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  image: String,
  description: String,
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sellerEmail: String,
  dosage: String,
  manufacturer: String,
  expireDate: Date,
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBestseller: {
    type: Boolean,
    default: false
  },
  bestsellerCategory: {
    type: String,
    enum: ['skincare', 'hair', 'body', null],
    default: null
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

module.exports = mongoose.model('Product', productSchema);
