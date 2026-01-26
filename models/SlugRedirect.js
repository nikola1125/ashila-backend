const mongoose = require('mongoose');

const slugRedirectSchema = new mongoose.Schema({
  oldSlug: {
    type: String,
    required: true,
    unique: true
  },
  newSlug: {
    type: String,
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
  }
});

// Index for performance
slugRedirectSchema.index({ oldSlug: 1 });
slugRedirectSchema.index({ productId: 1 });
slugRedirectSchema.index({ expiresAt: 1 });

// Clean up expired redirects
slugRedirectSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SlugRedirect', slugRedirectSchema);
