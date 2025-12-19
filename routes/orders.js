const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
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

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Alias: used by existing frontend AdminDashboard
router.get('/admin-dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const sumsAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$finalPrice' },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$finalPrice', 0],
            },
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$finalPrice', 0],
            },
          },
        },
      },
    ]);

    const sums = sumsAgg[0] || { totalAmount: 0, totalPaid: 0, totalPending: 0 };

    res.json({
      totalOrders,
      totalUsers,
      totalAmount: sums.totalAmount || 0,
      totalPaid: sums.totalPaid || 0,
      totalPending: sums.totalPending || 0,
      pendingOrders: await Order.countDocuments({ status: 'pending' }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all orders (admin)
router.get('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const orders = await Order.find().populate('items.productId');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: list orders by status (pending by default)
router.get('/admin/pending', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const orders = await Order.find({ status }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: confirm an order and decrement inventory stock exactly once
router.post('/admin/confirm/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be confirmed' });
    }

    // Decrement stock for each item
    for (const item of order.items || []) {
      const productId = item.productId || item.id || item._id;
      if (!productId) {
        continue;
      }
      await Product.findByIdAndUpdate(productId, { $inc: { stock: -Number(item.quantity || 0) } });
    }

    order.status = 'confirmed';
    order.updatedAt = Date.now();
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: order history with filters
router.get('/admin/history', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get orders by buyer email
router.get('/buyer/:email', requireAuth, async (req, res) => {
  try {
    const requesterEmail = req.user?.email;
    if (!requesterEmail) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (requesterEmail !== req.params.email) {
      const requester = await User.findOne({ email: requesterEmail }).select('role');
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const orders = await Order.find({ buyerEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get orders by seller email
router.get('/seller/:email', requireAuth, requireRole(['seller', 'admin']), async (req, res) => {
  try {
    const orders = await Order.find({ 'items.sellerEmail': req.params.email });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get order by id
router.get('/order/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.productId');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Admin JWT sessions do not have an email; allow admin to access any order.
    if (req.user?.admin === true) {
      return res.json(order);
    }

    const requesterEmail = req.user?.email;
    if (!requesterEmail) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (order.buyerEmail !== requesterEmail) {
      const requester = await User.findOne({ email: requesterEmail }).select('role');
      if (!requester || (requester.role !== 'admin' && requester.role !== 'seller')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (admin/seller)
router.patch('/:id', requireAuth, requireRole(['admin', 'seller']), async (req, res) => {
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
router.get('/stats/admin-dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
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
router.get('/admin/sales-report', requireAuth, requireRole(['admin']), async (req, res) => {
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

// Alias: used by existing frontend SalesReport
router.get('/sales-report', requireAuth, requireRole(['admin']), async (req, res) => {
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
