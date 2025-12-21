<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User'); // Assuming you have a User model

// Get all orders (Admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get orders by email (Client)
router.get('/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const orders = await Order.find({ buyerEmail: email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate order number
const generateOrderNumber = () => {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Create new order
router.post('/', async (req, res) => {
  try {
    const { items, buyerEmail, buyerName, deliveryAddress, status } = req.body;

    let totalPrice = 0;
    let discountAmount = 0;

    // Calculate total
    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const discount = itemTotal * (item.discount / 100);
      totalPrice += itemTotal;
      discountAmount += discount;
    });

    const finalPrice = totalPrice - discountAmount;

    const order = new Order({
      orderNumber: generateOrderNumber(),
      buyerEmail,
      buyerName,
      items,
      totalPrice,
      discountAmount,
      finalPrice,
      deliveryAddress,
      paymentStatus: 'unpaid',
      status: status || 'Pending'
    });

    // Update product stock
    const Product = require('../models/Product');
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Order Creation Error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Update order status (admin/seller)
router.patch('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const oldStatus = order.status;

    Object.assign(order, req.body);
    order.updatedAt = Date.now();
    const updatedOrder = await order.save();

    // Check if status changed to 'Confirmed'
    if (oldStatus !== 'Confirmed' && req.body.status === 'Confirmed') {
      // Send confirmation email
      const { sendOrderConfirmation } = require('../utils/emailService');
      // Don't await this to keep response fast
      sendOrderConfirmation(updatedOrder).catch(err => console.error('Email trigger fail:', err));
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- ANALYTICS ENDPOINTS ---

// Admin Dashboard Stats (Revenue, Users, Orders)
router.get('/stats/admin-dashboard', async (req, res) => {
  try {
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$finalPrice" } } }
    ]);

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });

    // Use estimatedDocumentCount for large collections or countDocuments for accuracy
    // Assuming User model exists, otherwise return 0
    let totalUsers = 0;
    try {
      totalUsers = await User.countDocuments({ role: 'client' });
    } catch (e) {
      console.warn("User model not found or error counting users", e);
    }

    res.json([{
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      pendingOrders,
      totalUsers
    }]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sales Report (Revenue by Status)
router.get('/admin/sales-report', async (req, res) => {
  try {
    const sales = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          totalRevenue: { $sum: "$finalPrice" },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
=======
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53
