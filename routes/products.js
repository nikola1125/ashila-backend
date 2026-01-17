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
    const { category, search, seller, limit, group } = req.query;
    let filter = {};

    if (category) filter.categoryName = category;
    if (seller) filter.sellerEmail = seller;
    if (search) {
      const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const regex = new RegExp(escapeRegex(search), 'i');

      filter.$or = [
        { itemName: { $regex: regex } },
        { genericName: { $regex: regex } },
        { company: { $regex: regex } },
        { categoryName: { $regex: regex } }
      ];
    }

    let query = Product.find(filter).populate('category').lean();

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const products = await query;

    // Group variants if requested
    if (group === 'true') {
      const groupedProducts = groupVariants(products);
      res.json({ result: groupedProducts });
    } else {
      res.json({ result: products });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper function to group product variants by variantGroupId
function groupVariants(products) {
  const grouped = {};
  const ungrouped = [];
  const processedIds = new Set(); // Track processed product IDs to prevent duplicates

  // First pass: collect all products with variantGroupId
  products.forEach(product => {
    // Skip if already processed (prevent duplicates)
    if (processedIds.has(product._id.toString())) {
      return;
    }

    // If product has variantGroupId, group by it
    if (product.variantGroupId) {
      const key = product.variantGroupId;

      if (!grouped[key]) {
        // Use the first product as the base (handle both Mongoose docs and plain objects)
        const baseProduct = product.toObject ? product.toObject() : product;
        grouped[key] = {
          ...baseProduct,
          _id: baseProduct._id, // Keep the first variant's ID for navigation
          variants: [],
          minPrice: product.price,
          maxPrice: product.price,
          totalStock: 0,
          variantGroupId: key // Keep variantGroupId for reference
        };
        // Remove size and stock from base product (they're in variants)
        delete grouped[key].size;
        delete grouped[key].stock;
      }

      // Add variant info
      grouped[key].variants.push({
        _id: product._id,
        size: product.size || product.dosage || '',
        price: product.price,
        stock: product.stock || 0,
        discount: product.discount || 0,
        image: product.image || product.imageUrl
      });

      // Update price range
      grouped[key].minPrice = Math.min(grouped[key].minPrice, product.price);
      grouped[key].maxPrice = Math.max(grouped[key].maxPrice, product.price);

      // Update total stock
      grouped[key].totalStock += (product.stock || 0);

      // Mark as processed
      processedIds.add(product._id.toString());
    } else {
      // Products without variantGroupId are standalone
      // Check if we've already seen this product
      if (!processedIds.has(product._id.toString())) {
        ungrouped.push(product);
        processedIds.add(product._id.toString());
      }
    }
  });

  // Return grouped products + ungrouped products
  return [...Object.values(grouped), ...ungrouped];
}

// Get latest products
router.get('/latest', async (req, res) => {
  try {
    const { group } = req.query;
    const products = await Product.find({ isActive: true })
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(16)
      .lean();

    if (group === 'true') {
      const groupedProducts = groupVariants(products);
      res.json({ medicines: groupedProducts, result: groupedProducts });
    } else {
      res.json({ medicines: products, result: products });
    }
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
      .limit(20)
      .lean();
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
    const products = await Product.find({ sellerEmail: email }).lean();
    res.json({ medicines: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get products by seller (path parameter - for backward compatibility)
router.get('/seller/:email', async (req, res) => {
  try {
    const products = await Product.find({ sellerEmail: req.params.email }).lean();
    res.json({ medicines: products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all bestseller products
router.get('/bestsellers', async (req, res) => {
  try {
    const { group } = req.query;
    const filter = {
      isBestseller: true,
      isActive: true
    };

    // If grouping is requested, find all variants of bestseller products
    if (group === 'true') {
      // First, get all bestseller products (no limit yet)
      const bestsellerProducts = await Product.find(filter)
        .populate('category')
        .sort({ createdAt: -1 })
        .lean();

      // Collect all variantGroupIds from bestseller products
      const variantGroupIds = bestsellerProducts
        .filter(p => p.variantGroupId)
        .map(p => p.variantGroupId);

      // Also collect unique variantGroupIds (remove duplicates)
      const uniqueVariantGroupIds = [...new Set(variantGroupIds)];

      // Find all products that are either:
      // 1. Marked as bestseller directly, OR
      // 2. Part of a variant group that has at least one bestseller
      const queryConditions = [
        { isBestseller: true, isActive: true }
      ];

      if (uniqueVariantGroupIds.length > 0) {
        queryConditions.push({ variantGroupId: { $in: uniqueVariantGroupIds }, isActive: true });
      }

      const allProducts = await Product.find({
        $or: queryConditions
      })
        .populate('category')
        .sort({ createdAt: -1 })
        .lean();

      // Group variants together
      const groupedProducts = groupVariants(allProducts);

      // Limit to 20 grouped products after grouping
      const limitedGroupedProducts = groupedProducts.slice(0, 20);

      res.json({ result: limitedGroupedProducts });
    } else {
      // No grouping - return individual products with limit
      const bestsellerProducts = await Product.find(filter)
        .populate('category')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      res.json({ result: bestsellerProducts });
    }
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
      .limit(20)
      .lean();

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
    const product = await Product.findById(req.params.id).populate('category').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create product (seller/admin) with R2 metadata
router.post('/', requireAuth, requireRole(['seller', 'admin']), upload.single('image'), async (req, res) => {
  console.log('=== PRODUCT CREATE REQUEST RECEIVED ===');
  console.log('Request headers:', req.headers['content-type']);
  console.log('Request body keys:', Object.keys(req.body));
  console.log('File uploaded:', req.file ? 'YES' : 'NO');
  if (req.file) {
    console.log('File details:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  }
  console.log('=====================================');

  try {
    let imageUrl = req.body.imageUrl || req.body.image || '';
    let imageId = req.body.imageId || '';

    // Upload image to R2 if file exists
    if (req.file) {
      console.log('Image upload detected:', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const { uploadToCloudflare } = require('../utils/cloudflare');
      try {
        // Process image with optimal size for our frontend
        // Using 1000x1000 for high quality display
        imageUrl = await uploadToCloudflare(req.file.buffer, req.file.originalname, {
          width: 500,
          height: 500,
          quality: 80,
          format: 'webp',
          fit: 'cover'
        });

        console.log('Image uploaded successfully to R2:', imageUrl);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image: ' + uploadError.message });
      }
    } else {
      console.log('No image file provided in request');
    }
    // Handle variants - can be array (JSON) or string (form-data)
    let variants = [];
    if (req.body.variants) {
      if (Array.isArray(req.body.variants)) {
        variants = req.body.variants;
      } else if (typeof req.body.variants === 'string') {
        try {
          variants = JSON.parse(req.body.variants);
        } catch (e) {
          console.error('Failed to parse variants:', e);
          variants = [];
        }
      }
    }

    const sellerEmail =
      req.body.seller ||
      req.body.sellerEmail ||
      req.appUser?.email ||
      req.user?.email ||
      (req.user?.admin === true ? 'admin' : null);

    // Handle multiple options
    let options = [];
    if (req.body.options) {
      if (Array.isArray(req.body.options)) {
        options = req.body.options;
      } else if (typeof req.body.options === 'string') {
        try {
          options = JSON.parse(req.body.options);
        } catch (e) {
          options = [];
        }
      }
    }

    // Base product data (common to all variants)
    const baseProductData = {
      itemName: req.body.itemName,
      genericName: req.body.genericName,
      company: req.body.company,
      category: req.body.category,
      categoryName: req.body.categoryName,
      subcategory: req.body.subcategory,
      productType: req.body.productType,
      option: req.body.option, // Keep for backward compatibility
      options: options, // New: Multiple options support
      price: req.body.price,
      discount: req.body.discount || 0,
      description: req.body.description,
      sellerEmail: sellerEmail,
      dosage: req.body.dosage,
      manufacturer: req.body.manufacturer,
      isBestseller: req.body.isBestseller === 'true' || req.body.isBestseller === true,
      bestsellerCategory: req.body.bestsellerCategory || null,
      isFreeDelivery: req.body.isFreeDelivery === 'true' || req.body.isFreeDelivery === true,
      skinProblem: req.body.skinProblem,
      variants: [] // Keep variants array empty for backward compatibility
    };

    // Only assign image fields if they have actual values (not null, undefined, or empty string)
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      baseProductData.image = imageUrl;
      baseProductData.imageUrl = imageUrl;
      console.log('Image data assigned to product:', {
        image: imageUrl,
        imageUrl: imageUrl,
        productId: baseProductData._id || 'new'
      });
    }
    if (imageId && typeof imageId === 'string' && imageId.trim() !== '') {
      baseProductData.imageId = imageId;
    }

    let savedProducts = [];
    let variantGroupId = null;

    // Generate variantGroupId if this is a variant creation or if variants are provided
    if (variants.length > 0 || req.body.isVariantMode === 'true') {
      // If creating variant of existing product, use its variantGroupId or create new one
      variantGroupId = req.body.variantGroupId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    if (variants.length > 0) {
      // Check for duplicate sizes in the variant group if variantGroupId is provided
      if (variantGroupId) {
        const existingProducts = await Product.find({ variantGroupId: variantGroupId });
        const existingSizes = existingProducts.map(p => (p.size || p.dosage || '').toLowerCase().trim());

        for (const variant of variants) {
          const variantSize = (variant.size || '').toLowerCase().trim();
          if (variantSize && existingSizes.includes(variantSize)) {
            return res.status(400).json({
              message: `A variant with size "${variant.size}" already exists for this product. Please use a different size or edit the existing variant.`
            });
          }
        }
      }

      // Create separate product documents for each variant
      for (const variant of variants) {
        // Validate variant has required fields
        if (!variant.size || !variant.size.trim()) {
          return res.status(400).json({ message: 'Variant size is required' });
        }

        const variantProduct = new Product({
          ...baseProductData,
          size: variant.size.trim(), // Use variant size as the main size
          price: variant.price || req.body.price, // Use variant price if provided
          stock: Number(variant.stock) || 0, // Use variant stock, ensure it's a number
          discount: variant.discount || req.body.discount || 0, // Use variant discount if provided
          variants: [], // No nested variants for variant products
          variantGroupId: variantGroupId // Link all variants together
        });

        const savedVariant = await variantProduct.save();
        savedProducts.push(savedVariant);
      }
    } else {
      // Single product without variants (or single variant creation)
      const singleProduct = new Product({
        ...baseProductData,
        size: req.body.size,
        stock: req.body.stock,
        variantGroupId: variantGroupId // Add variantGroupId if this is part of a variant group
      });

      const savedSingle = await singleProduct.save();
      savedProducts.push(savedSingle);
    }

    res.status(201).json(savedProducts);
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
        // Process image with optimal size for our frontend
        const imageUrl = await uploadToCloudflare(req.file.buffer, req.file.originalname, {
          width: 500,
          height: 500,
          quality: 80,
          format: 'webp',
          fit: 'cover'
        });
        req.body.image = imageUrl;
        req.body.imageUrl = imageUrl;
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image: ' + uploadError.message });
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

    // Handle multiple options for updates
    if (req.body.options) {
      if (Array.isArray(req.body.options)) {
        req.body.options = req.body.options;
      } else if (typeof req.body.options === 'string') {
        try {
          req.body.options = JSON.parse(req.body.options);
        } catch (err) {
          return res.status(400).json({ message: 'Invalid options data' });
        }
      }
    }

    // Handle bestseller status: if marking as bestseller and product has variantGroupId,
    // mark all variants in the group as bestseller
    const isMarkingBestseller = req.body.isBestseller === 'true' || req.body.isBestseller === true;
    const bestsellerCategory = req.body.bestsellerCategory || product.bestsellerCategory;

    if (isMarkingBestseller && product.variantGroupId) {
      // Mark all products in the same variant group as bestseller
      await Product.updateMany(
        { variantGroupId: product.variantGroupId },
        {
          isBestseller: true,
          bestsellerCategory: bestsellerCategory,
          updatedAt: Date.now()
        }
      );
    } else if (req.body.isBestseller === 'false' || req.body.isBestseller === false) {
      // If unmarking as bestseller and product has variantGroupId,
      // unmark all variants in the group
      if (product.variantGroupId) {
        await Product.updateMany(
          { variantGroupId: product.variantGroupId },
          {
            isBestseller: false,
            bestsellerCategory: null,
            updatedAt: Date.now()
          }
        );
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
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete image from Cloudflare R2 if it exists
    if (product.imageUrl || product.image) {
      const { deleteFromCloudflare } = require('../utils/cloudflare');
      await deleteFromCloudflare(product.imageUrl || product.image);
    }

    // Delete product from MongoDB
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product and associated image deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
