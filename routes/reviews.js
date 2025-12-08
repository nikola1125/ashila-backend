const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');
const router = express.Router();

// Get reviews for product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create review
router.post('/', async (req, res) => {
  const review = new Review({
    productId: req.body.productId,
    userId: req.body.userId,
    userName: req.body.userName,
    userEmail: req.body.userEmail,
    rating: req.body.rating,
    reviewText: req.body.reviewText
  });

  try {
    const savedReview = await review.save();

    // Update product rating
    const reviews = await Review.find({ productId: req.body.productId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(req.body.productId, {
      rating: avgRating,
      reviewCount: reviews.length
    });

    res.status(201).json(savedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete review
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
