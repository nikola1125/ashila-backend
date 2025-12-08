const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Create order
router.post('/', async (req, res) => {
  try {
    const { items, buyerEmail, buyerName, deliveryAddress } = req.body;

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
      paymentStatus: 'unpaid'
    });

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all orders (admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('items.productId');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get orders by buyer email
router.get('/buyer/:email', async (req, res) => {
  try {
    const orders = await Order.find({ buyerEmail: req.params.email });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get orders by seller email
router.get('/seller/:email', async (req, res) => {
  try {
    const orders = await Order.find({ 'items.sellerEmail': req.params.email });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get order by id
router.get('/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.productId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (admin/seller)
router.patch('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    Object.assign(order, req.body);
    order.updatedAt = Date.now();
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get admin dashboard stats
router.get('/stats/admin-dashboard', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await require('../models/User').countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$finalPrice' } } }
    ]);

    res.json([{
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders: await Order.countDocuments({ status: 'pending' })
    }]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get seller stats
router.get('/stats/:email', async (req, res) => {
  try {
    const sellerOrders = await Order.find({ 'items.sellerEmail': req.params.email });
    const totalSales = sellerOrders.reduce((sum, order) => sum + order.finalPrice, 0);
    const totalOrders = sellerOrders.length;

    res.json([{
      totalOrders,
      totalSales,
      completedOrders: sellerOrders.filter(o => o.status === 'delivered').length,
      pendingOrders: sellerOrders.filter(o => o.status === 'pending').length
    }]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get sales report
router.get('/admin/sales-report', async (req, res) => {
  try {
    const report = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$finalPrice' }
        }
      }
    ]);
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
