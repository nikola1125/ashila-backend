
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// Generate order number with better collision prevention
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const processId = process.pid.toString(36).substr(0, 4);
  return `ORD-${timestamp}-${random}-${processId}`;
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

    // Validate stock for each item - parallel processing for better performance
    const Product = require('../models/Product');
    const stockChecks = items.map(async (item) => {
      try {
        let product;
        
        // If item has selectedSize, find product by ID and size
        if (item.selectedSize) {
          product = await Product.findOne({ 
            _id: item.productId, 
            size: item.selectedSize 
          });
        } else {
          // Find product by ID only
          product = await Product.findById(item.productId);
        }

        if (!product) {
          return {
            itemName: item.itemName || 'Unknown Product',
            requestedQuantity: item.quantity,
            availableStock: 0,
            selectedSize: item.selectedSize || null
          };
        }

        const availableStock = Number(product.stock) || 0;
        const requestedQuantity = Number(item.quantity) || 0;

        if (requestedQuantity > availableStock) {
          return {
            itemName: item.itemName || product.itemName,
            requestedQuantity: requestedQuantity,
            availableStock: availableStock,
            selectedSize: item.selectedSize || product.size || null
          };
        }
        
        return null; // Stock is sufficient
      } catch (productError) {
        console.error(`Error checking stock for product ${item.productId}:`, productError);
        return {
          itemName: item.itemName || 'Unknown Product',
          requestedQuantity: item.quantity,
          availableStock: 0,
          selectedSize: item.selectedSize || null
        };
      }
    });

    // Wait for all stock checks to complete in parallel
    const stockCheckResults = await Promise.all(stockChecks);
    const insufficientStockItems = stockCheckResults.filter(result => result !== null);

    // If any items have insufficient stock, return error with details
    if (insufficientStockItems.length > 0) {
      return res.status(400).json({
        message: 'Nuk ka mjaftueshem stok për disa produkte',
        insufficientStockItems: insufficientStockItems
      });
    }

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

// Update order status (admin)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log(`[DEBUG] Order status update request for ID: ${req.params.id}`);
    console.log(`[DEBUG] Request body:`, req.body);

    const Product = require('../models/Product');
    const orderId = req.params.id;
    const nextStatus = req.body?.status;

    const isTxnUnsupportedError = (err) => {
      const msg = String(err?.message || '');
      return (
        err?.code === 20 ||
        msg.includes('Transaction numbers are only allowed on a replica set') ||
        msg.includes('replica set') ||
        msg.includes('Transaction')
      );
    };

    const runUpdate = async (session) => {
      const order = await Order.findById(orderId).session(session || null);
      if (!order) {
        const e = new Error('Order not found');
        e.status = 404;
        throw e;
      }

      const oldStatus = order.status;
      console.log(`[DEBUG] Current order status: "${oldStatus}"`);
      console.log(`[DEBUG] New status from request: "${nextStatus}"`);

      Object.assign(order, req.body);
      order.updatedAt = Date.now();
      const updatedOrder = await order.save({ session });
      console.log(`[DEBUG] Order saved. New status: "${updatedOrder.status}"`);

      // Only decrement stock when moving into Confirmed
      console.log(`[DEBUG] Checking stock update condition: oldStatus="${oldStatus}" vs nextStatus="${nextStatus}"`);
      if (oldStatus !== 'Confirmed' && nextStatus === 'Confirmed') {
        console.log(`[DEBUG] STOCK UPDATE CONDITION MET - Triggering stock update`);

        for (const item of updatedOrder.items) {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) continue;

          console.log(`[Stock Update] Confirming item: ${item.itemName} | Size: ${item.selectedSize} | Qty: ${qty}`);

          const query = item.selectedSize
            ? { _id: item.productId, size: item.selectedSize, stock: { $gte: qty } }
            : { _id: item.productId, stock: { $gte: qty } };

          const updateResult = await Product.findOneAndUpdate(
            query,
            { $inc: { stock: -qty } },
            { new: true, session }
          );

          if (!updateResult) {
            const e = new Error(`Insufficient stock or product not found for: ${item.itemName || item.productId}`);
            e.status = 400;
            throw e;
          }
        }
      } else {
        console.log(`[DEBUG] Stock update NOT triggered - condition not met`);
      }

      return { updatedOrder, oldStatus };
    };

    let updatedOrder;
    let oldStatus;

    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const r = await runUpdate(session);
        updatedOrder = r.updatedOrder;
        oldStatus = r.oldStatus;
        return true;
      });

      if (!result) {
        throw new Error('Transaction aborted');
      }
    } catch (err) {
      // If transactions aren't supported (non-replica set), fallback to non-transactional behavior
      if (isTxnUnsupportedError(err)) {
        console.warn('[WARN] MongoDB transactions unavailable. Falling back to non-transactional order confirmation.');
        const r = await runUpdate(undefined);
        updatedOrder = r.updatedOrder;
        oldStatus = r.oldStatus;
      } else {
        throw err;
      }
    } finally {
      await session.endSession();
    }

    // Send confirmation email after DB changes succeed
    if (oldStatus !== 'Confirmed' && nextStatus === 'Confirmed') {
      const { sendOrderConfirmation } = require('../utils/emailService');
      sendOrderConfirmation(updatedOrder).catch(err => console.error('Email trigger fail:', err));
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message });
  }
});


module.exports = router;
