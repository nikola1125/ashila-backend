const express = require('express');
const Category = require('../models/Category');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get category by id
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create category (admin only)
router.post('/', requireAuth, requireRole(['admin']), validateBody({
  categoryName: { type: 'string', required: true, min: 1, max: 200 },
  categoryImage: { type: 'string' },
  description: { type: 'string', max: 2000 }
}), async (req, res) => {
  const category = new Category({
    categoryName: req.body.categoryName,
    categoryImage: req.body.categoryImage,
    description: req.body.description
  });

  try {
    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update category (admin only)
router.patch('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const allowed = ['categoryName', 'categoryImage', 'description'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) category[f] = req.body[f];
    }
    category.updatedAt = Date.now();
    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete category (admin only)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
