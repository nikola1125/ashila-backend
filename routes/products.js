const express = require('express');
const Product = require('../models/Product');
const { requireAuth, requireRole } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit matching express limit
});
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, seller, limit } = req.query;
    let filter = {};

    if (category) filter.categoryName = category;
    if (seller) filter.sellerEmail = seller;
    if (search) {
      console.log('Search Query:', search);
      const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const regex = new RegExp(escapeRegex(search), 'i');

      filter.$or = [
        { itemName: { $regex: regex } },
        { genericName: { $regex: regex } },
        { company: { $regex: regex } },
        { categoryName: { $regex: regex } }
      ];
    }

    console.log('Search Filter:', JSON.stringify(filter));

    let query = Product.find(filter).populate('category');

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const products = await query;
    console.log(`Found ${products.length} products`);

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

// Get all bestseller products
router.get('/bestsellers', async (req, res) => {
  try {
    const filter = {
      isBestseller: true,
      isActive: true
    };
    const products = await Product.find(filter)
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ result: products });
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
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create product (seller/admin) with R2 metadata
router.post('/', requireAuth, requireRole(['seller', 'admin']), upload.single('image'), async (req, res) => {
  try {
    let imageUrl = req.body.imageUrl || req.body.image || null;

    // Upload image to R2 if file exists
    if (req.file) {
      const { uploadToCloudflare } = require('../utils/cloudflare');
      try {
        imageUrl = await uploadToCloudflare(req.file.buffer, req.file.originalname);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    }

    const imageId = req.body.imageId || null;

    const sellerEmail =
      req.body.seller ||
      req.body.sellerEmail ||
      req.appUser?.email ||
      req.user?.email ||
      (req.user?.admin === true ? 'admin' : null);

    const product = new Product({
      itemName: req.body.itemName,
      genericName: req.body.genericName,
      company: req.body.company,
      category: req.body.category, // ObjectId
      categoryName: req.body.categoryName,
      subcategory: req.body.subcategory,
      productType: req.body.productType,
      option: req.body.option,
      size: req.body.size,
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
      isFreeDelivery: req.body.isFreeDelivery === 'true' || req.body.isFreeDelivery === true,
      skinProblem: req.body.skinProblem,
      variants: req.body.variants ? JSON.parse(req.body.variants) : []
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update product (seller/admin) with optional R2 metadata update
router.patch('/:id', requireAuth, requireRole(['seller', 'admin']), upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.file) {
      const { uploadToCloudflare } = require('../utils/cloudflare');
      try {
        const imageUrl = await uploadToCloudflare(req.file.buffer, req.file.originalname);
        req.body.image = imageUrl;
        req.body.imageUrl = imageUrl;
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    } else if (req.body.imageUrl) {
      req.body.image = req.body.imageUrl;
    }

    if (req.body.isFreeDelivery !== undefined) {
      req.body.isFreeDelivery = req.body.isFreeDelivery === 'true' || req.body.isFreeDelivery === true;
    }

    if (req.body.categoryPath !== undefined && !Array.isArray(req.body.categoryPath)) {
      delete req.body.categoryPath;
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


    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
