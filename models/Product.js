const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true
  },
  skinProblem: String, // e.g. "papules", "cyst"
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
  option: String,      // e.g. "Lekure normale" - kept for backward compatibility
  options: [String],   // New: Multiple options support
  size: String,        // e.g. "50ml", "100 tablets"
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    set: function(val) {
      // Convert to string and handle null/undefined/object cases
      if (val === null || val === undefined || typeof val === 'object') {
        return '';
      }
      return String(val);
    }
  },
  imageUrl: {
    type: String,
    set: function(val) {
      // Convert to string and handle null/undefined/object cases
      if (val === null || val === undefined || typeof val === 'object') {
        return '';
      }
      return String(val);
    }
  },
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

// Add indexes for better query performance
productSchema.index({ itemName: 1 });
productSchema.index({ categoryName: 1 });
productSchema.index({ variantGroupId: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isBestseller: 1 });
productSchema.index({ size: 1 }); // For variant queries
productSchema.index({ options: 1 }); // New: Index for multiple options
productSchema.index({ categoryName: 1, isActive: 1 });
productSchema.index({ subcategory: 1, isActive: 1 });
productSchema.index({ productType: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
