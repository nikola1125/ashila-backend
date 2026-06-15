const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const { requireAuth, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// Generate a unique order number (retries on collision)
const generateOrderNumber = () => {
  const prefix = 'ASH';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}${random}`;
};

// Fields the admin is allowed to change on an order
const ORDER_EDITABLE_FIELDS = ['status', 'paymentStatus', 'trackingNumber', 'notes', 'deliveryAddress'];

// Resolve the real product/variant for an order item (source of truth for price)
const resolveItem = async (item) => {
  let product = null;
  let variant = null;

  if (item.productId) {
    product = await Product.findById(item.productId);
    if (!product) {
      const parent = await Product.findOne({ 'variants._id': item.productId });
      if (parent) {
        variant = parent.variants.find(v => v._id.toString() === String(item.productId)) || null;
        product = parent;
      }
    }
  } else if (item.itemName) {
    product = await Product.findOne({ itemName: item.itemName });
  }

  const availableStock = variant ? variant.stock : (product ? product.stock : 0);
  const unitPrice = variant ? variant.price : (product ? product.price : null);
  const discount = variant ? (variant.discount || 0) : (product ? (product.discount || 0) : 0);
  const productName = product ? product.itemName : (item.itemName || 'Unknown');

  return { product, variant, availableStock, unitPrice, discount, productName };
};

// Download Invoice PDF (owner or admin only)
router.get('/:id/download-pdf', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isAdmin = req.user?.typ === 'admin' || req.user?.admin === true;
    const isOwner = (req.user?.email || '').toLowerCase() === (order.buyerEmail || '').toLowerCase();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { generateInvoicePDF } = require('../services/pdfService');
    const pdfBuffer = await generateInvoicePDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderNumber || order._id}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Download Error:', err.message);
    res.status(500).json({ message: 'Error generating PDF invoice' });
  }
});

// --- ANALYTICS ENDPOINTS (must be before dynamic routes) ---

// Admin Dashboard Stats (Revenue, Users, Orders)
router.get('/stats/admin-dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$finalPrice' } } }
    ]);

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });

    let totalUsers = 0;
    try {
      totalUsers = await User.countDocuments({ role: 'user' });
    } catch (e) {
      console.warn('Error counting users:', e.message);
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
          _id: '$status',
          totalRevenue: { $sum: '$finalPrice' },
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

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    const now = new Date();

    if (range === 'day') {
      if (!startDate && !endDate) dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) } };
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    } else if (range === 'week') {
      if (!startDate && !endDate) dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 84)) } };
      groupBy = { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
    } else if (range === 'month') {
      if (!startDate && !endDate) dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 12)) } };
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    } else if (range === 'year') {
      groupBy = { $dateToString: { format: '%Y', date: '$createdAt' } };
    }

    const series = await Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: '$finalPrice' },
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

// Get orders by email (owner or admin only)
router.get('/:email', requireAuth, requireSelfOrAdmin((req) => req.params.email), async (req, res) => {
  try {
    const orders = await Order.find({ buyerEmail: req.params.email })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fire OneSignal push notification (non-blocking)
const notifyNewOrder = (orderNumber, buyerName) => {
  setImmediate(() => {
    try {
      const appId = process.env.ONESIGNAL_APP_ID;
      const apiKey = process.env.ONESIGNAL_REST_API_KEY;
      if (!appId || !apiKey) return;

      const data = JSON.stringify({
        app_id: appId,
        included_segments: ['All'],
        headings: { en: '🛒 New Order — Farmaci Ashila' },
        contents: { en: `${buyerName || 'A customer'} placed order #${orderNumber}` },
        url: 'https://www.farmaciashila.com/admin/orders',
        ios_sound: 'default',
        android_sound: 'default'
      });

      const https = require('https');
      const osReq = https.request({
        hostname: 'onesignal.com',
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Basic ${apiKey}`
        }
      }, (osRes) => {
        let body = '';
        osRes.on('data', d => body += d);
        osRes.on('end', () => {
          if (osRes.statusCode >= 400) console.error(`[OneSignal] Push failed (${osRes.statusCode})`);
        });
      });
      osReq.on('error', (e) => console.error('[OneSignal] Request error:', e.message));
      osReq.write(data);
      osReq.end();
    } catch (err) {
      console.error('[OneSignal] Exception:', err.message);
    }
  });
};

// Shared POST handler for orders
const handleOrderPost = async (req, res) => {
  try {
    const { items, deliveryAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    const isAdmin = req.user?.typ === 'admin' || req.user?.admin === true;
    // Derive buyer identity from the authenticated token (admins may place on behalf of a customer)
    const buyerEmail = isAdmin ? (req.body.buyerEmail || req.user?.email) : req.user?.email;
    const buyerName = req.body.buyerName || req.user?.name || req.user?.email;

    if (!buyerEmail) {
      return res.status(400).json({ message: 'Buyer email is required' });
    }

    const settings = await Settings.findOne();
    const freeDelivery = settings?.freeDelivery || false;
    const SHIPPING_COST = freeDelivery ? 0 : 300;

    // Resolve every item against the DB — prices come from the server, never the client
    const resolved = await Promise.all(items.map(async (item) => ({
      item,
      ...(await resolveItem(item))
    })));

    // Validate existence and stock
    const problems = [];
    for (const r of resolved) {
      const qty = Number(r.item.quantity) || 0;
      if (!r.product || r.unitPrice == null) {
        problems.push({ itemName: r.productName, reason: 'Product not found' });
      } else if (qty <= 0) {
        problems.push({ itemName: r.productName, reason: 'Invalid quantity' });
      } else if (r.availableStock < qty) {
        problems.push({
          itemName: r.productName,
          reason: 'Insufficient stock',
          requestedQuantity: qty,
          availableStock: r.availableStock
        });
      }
    }

    if (problems.length > 0) {
      return res.status(400).json({ message: 'Some items could not be ordered', problems });
    }

    // Build trusted line items and totals from server-side prices
    let totalPrice = 0;
    let discountAmount = 0;
    const trustedItems = resolved.map((r) => {
      const qty = Number(r.item.quantity);
      const itemTotal = r.unitPrice * qty;
      const itemDiscount = itemTotal * (r.discount / 100);
      totalPrice += itemTotal;
      discountAmount += itemDiscount;

      return {
        productId: r.item.productId,
        itemName: r.productName,
        quantity: qty,
        price: r.unitPrice,
        discount: r.discount,
        image: r.variant?.image || r.product.image,
        seller: r.product.seller,
        sellerEmail: r.product.sellerEmail,
        selectedSize: r.item.selectedSize || r.variant?.size
      };
    });

    const finalPrice = totalPrice - discountAmount + SHIPPING_COST;

    // Create the order, retrying once on the rare order-number collision
    let savedOrder = null;
    for (let attempt = 0; attempt < 5 && !savedOrder; attempt++) {
      try {
        const order = new Order({
          orderNumber: generateOrderNumber(),
          buyerEmail,
          buyerName,
          items: trustedItems,
          totalPrice,
          discountAmount,
          finalPrice,
          shippingCost: SHIPPING_COST,
          deliveryAddress,
          paymentStatus: 'unpaid',
          status: 'Pending'
        });
        savedOrder = await order.save();
      } catch (err) {
        if (err.code === 11000 && attempt < 4) continue; // duplicate orderNumber, retry
        throw err;
      }
    }

    notifyNewOrder(savedOrder.orderNumber, buyerName);
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Order Creation Error:', err.message);
    res.status(400).json({ message: err.message });
  }
};

// Create order (Client) — primary endpoint
router.post('/', requireAuth, handleOrderPost);

// Checkout alias (Client) — backward compatible
router.post('/checkout', requireAuth, handleOrderPost);

// Update order status (admin)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const nextStatus = req.body?.status;

    // Whitelist the fields an admin may change
    const updates = {};
    for (const f of ORDER_EDITABLE_FIELDS) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

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
      Object.assign(order, updates);
      order.updatedAt = Date.now();
      const updatedOrder = await order.save({ session });

      // Only decrement stock when moving into Confirmed
      if (oldStatus !== 'Confirmed' && nextStatus === 'Confirmed') {
        for (const item of updatedOrder.items) {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) continue;

          // First try to update as a variant
          let updateResult = await Product.findOneAndUpdate(
            { 'variants._id': item.productId, 'variants.stock': { $gte: qty } },
            { $inc: { 'variants.$.stock': -qty, stock: -qty }, updatedAt: Date.now() },
            { new: true, session }
          );

          // If not found as a variant, try as a top-level product
          if (!updateResult) {
            const query = item.selectedSize
              ? { _id: item.productId, size: item.selectedSize, stock: { $gte: qty } }
              : { _id: item.productId, stock: { $gte: qty } };

            updateResult = await Product.findOneAndUpdate(
              query,
              { $inc: { stock: -qty }, updatedAt: Date.now() },
              { new: true, session }
            );
          }

          if (!updateResult) {
            const e = new Error(`Insufficient stock or product not found for: ${item.itemName || item.productId}`);
            e.status = 400;
            throw e;
          }
        }
      }

      return { updatedOrder, oldStatus };
    };

    let updatedOrder;
    let oldStatus;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const r = await runUpdate(session);
        updatedOrder = r.updatedOrder;
        oldStatus = r.oldStatus;
      });
    } catch (err) {
      if (isTxnUnsupportedError(err)) {
        console.warn('[WARN] MongoDB transactions unavailable. Falling back to non-transactional confirmation.');
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
      const emailService = require('../services/emailService');
      emailService.sendOrderConfirmation(updatedOrder.buyerEmail, updatedOrder)
        .catch(err => console.error('Email trigger fail:', err.message));
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error('[Order Update Error]', err.message);
    res.status(err.status || 400).json({ message: err.message });
  }
});

module.exports = router;
