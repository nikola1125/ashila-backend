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
    required: false
  },
  categoryName: String,
  subcategory: String, // e.g. "Tipi i lekures"
  productType: String,
  option: String,      // e.g. "Lekure normale"
  size: String,        // e.g. "50ml", "100 tablets"
  skinProblem: String, // e.g. "papules", "cyst"
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  image: String,
  imageUrl: String,
  imageId: String,
  description: String,
  size: String,
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0 // Prevent negative stock
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
  isFreeDelivery: {
    type: Boolean,
    default: false
  },
  bestsellerCategory: {
    type: String,
    enum: ['skincare', 'hair', 'body', null],
    default: null
  },
  variants: [{
    size: String,
    price: Number,
    stock: Number,
    discount: {
      type: Number,
      default: 0
    }
  }],
  variantGroupId: {
    type: String,
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
