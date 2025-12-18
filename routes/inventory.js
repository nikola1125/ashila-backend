const express = require('express');
const Product = require('../models/Product');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin inventory list
router.get('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { lowStockOnly } = req.query;
    const filter = {};

    if (String(lowStockOnly).toLowerCase() === 'true') {
      filter.stock = { $lte: 10 };
    }

    const products = await Product.find(filter)
      .select('itemName company categoryName stock price image imageUrl imageId updatedAt createdAt')
      .sort({ updatedAt: -1 });

    res.json({ result: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Low stock summary
router.get('/low-stock', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const products = await Product.find({ stock: { $lte: 10 } })
      .select('itemName company categoryName stock price image imageUrl imageId updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .limit(limit);

    res.json({ result: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update stock quantity
router.patch('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock === null || Number.isNaN(Number(stock))) {
      return res.status(400).json({ message: 'stock is required and must be a number' });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { stock: Number(stock), updatedAt: Date.now() },
      { new: true }
    ).select('itemName company categoryName stock price image imageUrl imageId updatedAt createdAt');

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
