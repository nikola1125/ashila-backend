const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  buyerEmail: {
    type: String,
    required: true
  },
  buyerName: String,
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    itemName: String,
    quantity: Number,
    price: Number,
    discount: Number,
    seller: String,
    sellerEmail: String
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  finalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid'
  },
  deliveryAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String,
    phoneNumber: String
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  trackingNumber: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
