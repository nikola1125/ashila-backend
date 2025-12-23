
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Generate order number
const generateOrderNumber = () => {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// --- ANALYTICS ENDPOINTS (Must be before dynamic routes) ---

// Admin Dashboard Stats (Revenue, Users, Orders)
router.get('/stats/admin-dashboard', requireAuth, requireAdmin, async (req, res) => {
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
      totalUsers = await User.countDocuments({ role: 'user' });
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
router.get('/admin/sales-report', requireAuth, requireAdmin, async (req, res) => {
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

// Revenue Series Analytics (Day, Week, Month, Year)
router.get('/admin/revenue-series', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { range = 'day', startDate, endDate } = req.query;
    let groupBy = {};
    let dateFilter = {};

    // Explicit Date Range Handling
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        // Create end date object set to end of that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    const now = new Date();

    if (range === 'day') {
      // Default: Last 7 days if no dates provided
      if (!startDate && !endDate) dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) } };
      groupBy = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
    } else if (range === 'week') {
      // Default: Last 12 weeks
      if (!startDate && !endDate) dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 84)) } };
      groupBy = {
        $dateToString: { format: "%Y-%U", date: "$createdAt" }
      };
    } else if (range === 'month') {
      // Default: Last 12 months
      if (!startDate && !endDate) dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 12)) } };
      groupBy = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      };
    } else if (range === 'year') {
      // All time by year default
      groupBy = {
        $dateToString: { format: "%Y", date: "$createdAt" }
      };
    }

    const series = await Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'Cancelled' } } }, // Exclude cancelled?
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: "$finalPrice" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(series);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all orders (Admin)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('items.productId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get orders by email (Client)
router.get('/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const orders = await Order.find({ buyerEmail: email }).populate('items.productId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}); router.post('/', async (req, res) => {
  try {
    const { items, buyerEmail, buyerName, deliveryAddress, status } = req.body;

    const SHIPPING_COST = 300; // Fixed delivery fee

    let totalPrice = 0;
    let discountAmount = 0;

    // Calculate total
    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const discount = itemTotal * (item.discount / 100);
      totalPrice += itemTotal;
      discountAmount += discount;
    });

    // Final price includes shipping
    const finalPrice = totalPrice - discountAmount + SHIPPING_COST;

    const order = new Order({
      orderNumber: generateOrderNumber(),
      buyerEmail,
      buyerName,
      items,
      totalPrice,
      discountAmount,
      finalPrice,
      shippingCost: SHIPPING_COST,
      deliveryAddress,
      paymentStatus: 'unpaid',
      status: status || 'Pending'
    });

    // Stock update removed from here. will be handled on confirmation.

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
    console.log(`[DEBUG] Order status update request for ID: ${req.params.id}`);
    console.log(`[DEBUG] Request body:`, req.body);
    
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const oldStatus = order.status;
    console.log(`[DEBUG] Current order status: "${oldStatus}"`);
    console.log(`[DEBUG] New status from request: "${req.body.status}"`);

    Object.assign(order, req.body);
    order.updatedAt = Date.now();
    const updatedOrder = await order.save();
    
    console.log(`[DEBUG] Order saved. New status: "${updatedOrder.status}"`);

    // Check if status changed to 'Confirmed'
    console.log(`[DEBUG] Checking stock update condition: oldStatus="${oldStatus}" vs req.body.status="${req.body.status}"`);
    if (oldStatus !== 'Confirmed' && req.body.status === 'Confirmed') {
      console.log(`[DEBUG] STOCK UPDATE CONDITION MET - Triggering stock update`);
      // 1. Decrement Stock
      const Product = require('../models/Product');
      for (const item of order.items) { // Use order.items from the fetched order
        console.log(`[Stock Update] Confirming item: ${item.itemName} | Size: ${item.selectedSize} | Qty: ${item.quantity}`);

        try {
          let updateResult;
          if (item.selectedSize) {
            // Find the product variant by size and product ID
            updateResult = await Product.findOneAndUpdate(
              { _id: item.productId, size: item.selectedSize },
              { $inc: { stock: -item.quantity } },
              { new: true }
            );
          } else {
            // Update product without size variant
            updateResult = await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { stock: -item.quantity } },
              { new: true }
            );
          }

          if (!updateResult) {
            console.error(`[Stock Update Error] Product not found: ${item.productId} | Size: ${item.selectedSize}`);
            // Continue with other items but log the error
          } else {
            console.log(`[Stock Update Success] Updated product: ${updateResult.itemName} | Size: ${updateResult.size || 'N/A'} | New stock: ${updateResult.stock}`);
          }
        } catch (stockError) {
          console.error(`[Stock Update Error] Failed to update stock for item: ${item.itemName} | Error: ${stockError.message}`);
          // Continue with other items but don't fail the entire order
        }
      }

      // 2. Send confirmation email
      const { sendOrderConfirmation } = require('../utils/emailService');
      // Don't await this to keep response fast
      sendOrderConfirmation(updatedOrder).catch(err => console.error('Email trigger fail:', err));
    } else {
      console.log(`[DEBUG] Stock update NOT triggered - condition not met`);
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


module.exports = router;
