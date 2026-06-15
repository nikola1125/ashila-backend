const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const recalcProductRating = async (productId) => {
  const reviews = await Review.find({ productId });
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;
  await Product.findByIdAndUpdate(productId, {
    rating: avgRating,
    reviewCount: reviews.length
  });
};

// Get reviews for product (public)
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create review (authenticated; identity comes from the token, not the body)
router.post('/', requireAuth, async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    if (!req.body.productId || !(rating >= 1 && rating <= 5)) {
      return res.status(400).json({ message: 'A valid productId and rating (1-5) are required' });
    }

    const review = new Review({
      productId: req.body.productId,
      userId: req.user?.uid || req.user?.email,
      userName: req.user?.name || req.body.userName,
      userEmail: req.user?.email,
      rating,
      reviewText: req.body.reviewText
    });

    const savedReview = await review.save();
    await recalcProductRating(req.body.productId);
    res.status(201).json(savedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete review (admin or the review's author)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const isAdmin = req.user?.typ === 'admin' || req.user?.admin === true;
    const isOwner = (req.user?.email || '').toLowerCase() === (review.userEmail || '').toLowerCase();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const productId = review.productId;
    await review.deleteOne();
    await recalcProductRating(productId);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
