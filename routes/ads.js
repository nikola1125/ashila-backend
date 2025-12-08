const express = require('express');
const Ad = require('../models/Ad');
const router = express.Router();

// Get all active ads
router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({ isActive: true });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ads by seller
router.get('/seller/:email', async (req, res) => {
  try {
    const ads = await Ad.find({ sellerEmail: req.params.email });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create ad request (seller)
router.post('/', async (req, res) => {
  const ad = new Ad({
    title: req.body.title,
    description: req.body.description,
    imgUrl: req.body.imgUrl,
    sellerEmail: req.body.sellerEmail,
    status: 'pending'
  });

  try {
    const savedAd = await ad.save();
    res.status(201).json(savedAd);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Approve ad (admin)
router.patch('/:id/approve', async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, {
      status: 'active',
      isActive: true
    }, { new: true });
    res.json(ad);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reject ad (admin)
router.patch('/:id/reject', async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, {
      status: 'inactive'
    }, { new: true });
    res.json(ad);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete ad
router.delete('/:id', async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
