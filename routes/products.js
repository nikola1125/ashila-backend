const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');
const { uploadImage, deleteImage } = require('../utils/uploadImage');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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

// Create product (seller) with image upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = req.body.image; // Use provided URL if no file

    // If image file was uploaded, upload to Supabase
    if (req.file) {
      try {
        imageUrl = await uploadImage(req.file.buffer, req.file.originalname);
      } catch (uploadErr) {
        return res.status(400).json({ message: `Image upload failed: ${uploadErr.message}` });
      }
    }

    const product = new Product({
      itemName: req.body.itemName,
      genericName: req.body.genericName,
      company: req.body.company,
      categoryName: req.body.categoryName,
      price: req.body.price,
      discount: req.body.discount || 0,
      image: imageUrl,
      description: req.body.description,
      stock: req.body.stock,
      sellerEmail: req.body.seller,
      dosage: req.body.dosage,
      manufacturer: req.body.manufacturer
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update product with optional image upload
router.patch('/:id', upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // If new image file is uploaded, replace old image
    if (req.file) {
      try {
        // Delete old image from Supabase if it exists
        if (product.image && product.image.includes('supabase')) {
          await deleteImage(product.image);
        }

        // Upload new image
        const newImageUrl = await uploadImage(req.file.buffer, req.file.originalname);
        req.body.image = newImageUrl;
      } catch (uploadErr) {
        return res.status(400).json({ message: `Image upload failed: ${uploadErr.message}` });
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
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete image from Supabase if it exists
    if (product.image && product.image.includes('supabase')) {
      await deleteImage(product.image);
    }

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
