const express = require('express');
const Product = require('../models/Product');
<<<<<<< HEAD
// Supabase import removed

=======
const { requireAuth, requireRole } = require('../middleware/auth');
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, seller } = req.query;
    let filter = {};

    if (category) filter.categoryName = category;
    if (seller) filter.sellerEmail = seller;
    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).populate('category');
    res.json({ result: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get latest products
router.get('/latest', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(16);
    res.json({ medicines: products, result: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get top discount products
router.get('/top-discount', async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      discount: { $gt: 0 } // Only products with discount > 0
    })
      .populate('category')
      .sort({ discount: -1 }) // Sort by discount descending
      .limit(20);
    res.json({ medicines: products, result: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

<<<<<<< HEAD
// Get all bestseller products
router.get('/bestsellers', async (req, res) => {
  try {
    const products = await Product.find({ isBestseller: true })
      .populate('category')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('Bestsellers error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get bestseller products by category
router.get('/bestsellers/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const filter = {
      isBestseller: true,
      bestsellerCategory: category
    };
    const products = await Product.find(filter)
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(products);
  } catch (err) {
    console.error('Bestsellers error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get product by id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

=======
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53
// Get products by seller (query parameter)
router.get('/seller', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email parameter is required' });
    }
    const products = await Product.find({ sellerEmail: email });
    res.json({ medicines: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get products by seller (path parameter - for backward compatibility)
router.get('/seller/:email', async (req, res) => {
  try {
    const products = await Product.find({ sellerEmail: req.params.email });
    res.json({ medicines: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

<<<<<<< HEAD


const { uploadToCloudflare, deleteFromCloudflare } = require('../utils/cloudflare');
// ... imports

// Create product (seller/admin) with image upload
router.post('/', upload.single('image'), async (req, res) => {
=======
// Get bestseller products by category
router.get('/bestsellers/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const filter = {
      isBestseller: true,
      bestsellerCategory: category
    };
    // isActive defaults to true, so we don't need to filter by it
    const products = await Product.find(filter)
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(20);

    // Return as array (frontend checks for array first, then result property)
    res.json(products);
  } catch (err) {
    console.error('Bestsellers error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get product by id (must be after /seller routes)
router.get('/:id', async (req, res) => {
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

<<<<<<< HEAD
    // If image file was uploaded, upload to Cloudflare
    if (req.file) {
      try {
        imageUrl = await uploadToCloudflare(req.file.buffer, req.file.originalname);
      } catch (uploadErr) {
        return res.status(400).json({ message: `Image upload failed: ${uploadErr.message}` });
      }
    }
=======
// Create product (seller/admin) with R2 metadata
router.post('/', requireAuth, requireRole(['seller', 'admin']), async (req, res) => {
  try {
    const imageUrl = req.body.imageUrl || req.body.image || null;
    const imageId = req.body.imageId || null;

    const sellerEmail =
      req.body.seller ||
      req.body.sellerEmail ||
      req.appUser?.email ||
      req.user?.email ||
      (req.user?.admin === true ? 'admin' : null);
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53

    const product = new Product({
      itemName: req.body.itemName,
      genericName: req.body.genericName,
      company: req.body.company,
      category: req.body.category, // ObjectId
      categoryName: req.body.categoryName,
<<<<<<< HEAD
      subcategory: req.body.subcategory,
      option: req.body.option,
      size: req.body.size,
=======
      categoryPath: Array.isArray(req.body.categoryPath) ? req.body.categoryPath : undefined,
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53
      price: req.body.price,
      discount: req.body.discount || 0,
      image: imageUrl,
      imageUrl: imageUrl,
      imageId: imageId,
      description: req.body.description,
      stock: req.body.stock,
      size: req.body.size,
      sellerEmail: sellerEmail,
      dosage: req.body.dosage,
      manufacturer: req.body.manufacturer,
      isBestseller: req.body.isBestseller === 'true' || req.body.isBestseller === true,
      bestsellerCategory: req.body.bestsellerCategory || null,
      variants: req.body.variants ? JSON.parse(req.body.variants) : []
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update product (seller/admin) with optional R2 metadata update
router.patch('/:id', requireAuth, requireRole(['seller', 'admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

<<<<<<< HEAD
    // If new image file is uploaded, replace old image
    if (req.file) {
      try {
        // Cloudflare images don't necessarily need explicit delete if we just overwrite the URL, 
        // but for hygiene you might delete. For now, just upload new.
        const newImageUrl = await uploadToCloudflare(req.file.buffer, req.file.originalname);
        req.body.image = newImageUrl;
      } catch (uploadErr) {
        return res.status(400).json({ message: `Image upload failed: ${uploadErr.message}` });
      }
=======
    if (req.body.imageUrl) {
      req.body.image = req.body.imageUrl;
    }

    if (req.body.categoryPath !== undefined && !Array.isArray(req.body.categoryPath)) {
      delete req.body.categoryPath;
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53
    }

    if (req.body.variants) {
      try {
        req.body.variants = JSON.parse(req.body.variants);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid variants data' });
      }
    }

    Object.assign(product, req.body);
    product.updatedAt = Date.now();
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete product
router.delete('/:id', requireAuth, requireRole(['seller', 'admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

<<<<<<< HEAD
    // Delete image from Cloudflare/Supabase if it exists
    if (product.image) {
      if (product.image.includes(process.env.R2_PUBLIC_URL) || product.image.includes('r2.dev')) {
        await deleteFromCloudflare(product.image);
      } else if (product.image.includes('supabase')) {
        // Keep existing logic if 'deleteImage' was a real function from somewhere else,
        // but it looked like it wasn't imported in the file view.
        // If deleteImage is not defined, this would crash.
        // Given I didn't see deleteImage imported, let's comment it out or handle it safely.
        // Looking at line 4: // Supabase import removed. So deleteImage is likely undefined.
        console.log('Skipping Supabase deletion as utility is removed.');
      }
    }

=======
>>>>>>> 9a5b9c9073205f952d1433b11764cd4b94463e53
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
