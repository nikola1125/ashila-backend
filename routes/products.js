const express = require('express');
const Product = require('../models/Product');
const SlugService = require('../services/SlugService');
const googleIndexingService = require('../services/GoogleIndexingService');
const sitemapService = require('../services/SitemapService');
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

    let query = Product.find(filter)
      .select('-description') // Exclude heavy description field
      .populate('category')
      .lean();

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

  // First pass: collect all products with variantGroupId or internal variants
  products.forEach(product => {
    // Skip if already processed (prevent duplicates)
    if (processedIds.has(product._id.toString())) {
      return;
    }

    const pObj = product.toObject ? product.toObject() : product;

    // If product has internal variants, it's already a consolidated product
    if (pObj.variants && pObj.variants.length > 0) {
      const vPrices = pObj.variants.map(v => v.price).filter(p => p !== undefined && p !== null);
      const totalStock = pObj.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

      ungrouped.push({
        ...pObj,
        minPrice: vPrices.length > 0 ? Math.min(...vPrices) : pObj.price,
        maxPrice: vPrices.length > 0 ? Math.max(...vPrices) : pObj.price,
        totalStock: totalStock
      });
      processedIds.add(pObj._id.toString());
      return;
    }

    // If product has variantGroupId (legacy separate documents), group by it
    if (pObj.variantGroupId) {
      const key = pObj.variantGroupId;

      if (!grouped[key]) {
        grouped[key] = {
          ...pObj,
          _id: pObj._id, // Keep the first variant's ID for navigation
          variants: [],
          minPrice: pObj.price,
          maxPrice: pObj.price,
          totalStock: 0,
          variantGroupId: key // Keep variantGroupId for reference
        };
        // Remove size and stock from base product (they're in variants)
        delete grouped[key].size;
        delete grouped[key].stock;
      }

      // Add variant info
      grouped[key].variants.push({
        _id: pObj._id,
        size: pObj.size || pObj.dosage || '',
        price: pObj.price,
        stock: pObj.stock || 0,
        discount: pObj.discount || 0,
        color: pObj.color || '',
        image: pObj.image || pObj.imageUrl
      });

      // Update price range
      grouped[key].minPrice = Math.min(grouped[key].minPrice, pObj.price);
      grouped[key].maxPrice = Math.max(grouped[key].maxPrice, pObj.price);

      // Update total stock
      grouped[key].totalStock += (pObj.stock || 0);

      // Mark as processed
      processedIds.add(pObj._id.toString());
    } else {
      // Products without variants or group ID are standalone
      ungrouped.push({
        ...pObj,
        totalStock: pObj.stock || 0,
        minPrice: pObj.price,
        maxPrice: pObj.price
      });
      processedIds.add(pObj._id.toString());
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

// Get medicines/products by category slug or name (used by /category/:categoryName page)
// NOTE: must be before '/:id'
router.get('/by-category/:category', async (req, res) => {
  try {
    const raw = String(req.params.category || '').trim();
    const category = raw.replace(/-/g, ' ').trim();

    // Escape regex special chars to avoid ReDoS / invalid patterns
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(escapeRegex(category), 'i');

    const products = await Product.find({
      isActive: true,
      categoryName: { $regex: regex }
    })
      .populate('category')
      .lean();

    res.json({ result: products, medicines: products });
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

      res.json({ result: limitedGroupedProducts, medicines: limitedGroupedProducts });
    } else {
      // No grouping - return individual products with limit
      const bestsellerProducts = await Product.find(filter)
        .populate('category')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      res.json({ result: bestsellerProducts, medicines: bestsellerProducts });
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

// Backward-compatible: allow GET /medicines/:categoryName for non-ObjectId params
router.get('/:category', async (req, res, next) => {
  const raw = String(req.params.category || '').trim();

  // If it looks like a Mongo ObjectId, let the real '/:id' handler below process it.
  if (/^[a-f\d]{24}$/i.test(raw)) return next();

  try {
    const category = raw.replace(/-/g, ' ').trim();
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(escapeRegex(category), 'i');

    const products = await Product.find({
      isActive: true,
      categoryName: { $regex: regex }
    })
      .populate('category')
      .lean();

    return res.json({ result: products, medicines: products });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Get product by id (must be after /seller routes)
router.get('/:id', async (req, res) => {
  try {
    let product = await Product.findById(req.params.id).populate('category').lean();

    // If not found by direct ID, search in variants sub-documents
    if (!product) {
      const parentProduct = await Product.findOne({ "variants._id": req.params.id }).populate('category').lean();
      if (parentProduct) {
        const variant = parentProduct.variants.find(v => v._id.toString() === req.params.id);
        if (variant) {
          // Override top-level fields with variant-specific data for cart/detail consistency
          product = {
            ...parentProduct,
            _id: variant._id, // Return the variant ID as the main ID for the cart
            parentId: parentProduct._id,
            price: variant.price,
            stock: variant.stock,
            discount: variant.discount || 0,
            size: variant.size || parentProduct.size,
            color: variant.color || parentProduct.color,
            image: variant.image || parentProduct.image,
            imageUrl: variant.image || parentProduct.imageUrl
          };
        }
      }
    }

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create product (seller/admin) with R2 metadata
router.post('/', requireAuth, requireRole(['seller', 'admin']), upload.any(), async (req, res) => {
  console.log('=== PRODUCT CREATE REQUEST RECEIVED ===');
  console.log('Request headers:', req.headers['content-type']);
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Files uploaded:', req.files ? req.files.length : 0);
  console.log('=====================================');

  try {
    const { uploadToCloudflare } = require('../utils/cloudflare');

    // Helper to upload a single file buffer
    const uploadFile = async (file) => {
      try {
        return await uploadToCloudflare(file.buffer, file.originalname, {
          width: 500,
          height: 500,
          quality: 80,
          format: 'webp',
          fit: 'cover'
        });
      } catch (err) {
        console.error('File upload failed:', err);
        throw err;
      }
    };

    // Process main product image
    let mainImageUrl = req.body.imageUrl || req.body.image || '';
    const mainImageFile = req.files?.find(f => f.fieldname === 'image');
    if (mainImageFile) {
      mainImageUrl = await uploadFile(mainImageFile);
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

    // Process color-specific images
    const colorImageMap = {};
    const colorImageFiles = req.files?.filter(f => f.fieldname.startsWith('colorImage_')) || [];

    for (const file of colorImageFiles) {
      const colorName = file.fieldname.replace('colorImage_', '');
      try {
        const imageUrl = await uploadFile(file);
        colorImageMap[colorName] = imageUrl;
      } catch (err) {
        console.error(`Failed to upload image for color ${colorName}:`, err);
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

    if (mainImageUrl) {
      baseProductData.image = mainImageUrl;
      baseProductData.imageUrl = mainImageUrl;
    }
    if (req.body.imageId) {
      baseProductData.imageId = req.body.imageId;
    }

    let savedProducts = [];
    let variantGroupId = null;

    // Generate variantGroupId if this is a variant creation or if variants are provided
    if (variants.length > 0 || req.body.isVariantMode === 'true') {
      // If creating variant of existing product, use its variantGroupId or create new one
      variantGroupId = req.body.variantGroupId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    if (variants.length > 0) {
      // Process variants for the single document
      const processedVariants = await Promise.all(variants.map(async (variant, i) => {
        const color = (variant.color || '').trim();
        let variantImageUrl = colorImageMap[color] || variant.image || mainImageUrl;

        // Fallback for legacy variant images
        const variantImageFile = req.files?.find(f => f.fieldname === `variantImage_${i}`);
        if (variantImageFile) {
          variantImageUrl = await uploadFile(variantImageFile);
        }

        return {
          size: (variant.size || '').trim(),
          color: color || null,
          price: Number(variant.price) || Number(req.body.price) || 0,
          stock: Number(variant.stock) || 0,
          discount: Number(variant.discount) || Number(req.body.discount) || 0,
          image: variantImageUrl
        };
      }));

      // Set top-level fields from the first variant for consistency/listing
      const primaryVariant = processedVariants[0];
      const singleProduct = new Product({
        ...baseProductData,
        size: primaryVariant.size,
        color: primaryVariant.color,
        image: primaryVariant.image,
        imageUrl: primaryVariant.image,
        price: primaryVariant.price,
        stock: processedVariants.reduce((sum, v) => sum + v.stock, 0), // Total stock
        discount: primaryVariant.discount,
        variants: processedVariants,
        variantGroupId: variantGroupId
      });

      const savedProduct = await singleProduct.save();
      savedProducts.push(savedProduct);
    } else {
      // Single product without variants
      const color = (req.body.color || '').trim();
      const finalImageUrl = colorImageMap[color] || mainImageUrl;

      const singleProduct = new Product({
        ...baseProductData,
        size: req.body.size,
        color: req.body.color || null,
        stock: Number(req.body.stock) || 0,
        image: finalImageUrl,
        imageUrl: finalImageUrl,
        variantGroupId: variantGroupId
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
router.patch('/:id', requireAuth, requireRole(['seller', 'admin']), upload.any(), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { uploadToCloudflare } = require('../utils/cloudflare');
    const uploadFile = async (file) => {
      return await uploadToCloudflare(file.buffer, file.originalname, {
        width: 500,
        height: 500,
        quality: 80,
        format: 'webp',
        fit: 'cover'
      });
    };

    // Process color-specific images in PATCH
    const colorImageMap = {};
    const colorImageFiles = req.files?.filter(f => f.fieldname.startsWith('colorImage_')) || [];

    for (const file of colorImageFiles) {
      const colorName = file.fieldname.replace('colorImage_', '');
      try {
        const imageUrl = await uploadFile(file);
        colorImageMap[colorName] = imageUrl;
      } catch (err) {
        console.error(`Failed to upload image for color ${colorName} in PATCH:`, err);
      }
    }

    const imageFile = req.files?.find(f => f.fieldname === 'image');
    if (imageFile) {
      const imageUrl = await uploadFile(imageFile);
      req.body.image = imageUrl;
      req.body.imageUrl = imageUrl;
    } else if (req.body.imageUrl) {
      req.body.image = req.body.imageUrl;
    }

    // Apply color-specific image if it match the current/new color
    const currentColor = (req.body.color || product.color || '').trim();
    if (colorImageMap[currentColor]) {
      req.body.image = colorImageMap[currentColor];
      req.body.imageUrl = colorImageMap[currentColor];
    }

    if (req.body.isFreeDelivery !== undefined) {
      req.body.isFreeDelivery = req.body.isFreeDelivery === 'true' || req.body.isFreeDelivery === true;
    }

    if (req.body.isBestseller !== undefined) {
      req.body.isBestseller = req.body.isBestseller === 'true' || req.body.isBestseller === true;
    }

    if (req.body.categoryPath !== undefined && !Array.isArray(req.body.categoryPath)) {
      delete req.body.categoryPath;
    }

    // Handle multiple options for updates
    if (req.body.options) {
      if (!Array.isArray(req.body.options)) {
        try {
          req.body.options = JSON.parse(req.body.options);
        } catch (err) {
          return res.status(400).json({ message: 'Invalid options data' });
        }
      }
    }

    if (req.body.variants) {
      if (!Array.isArray(req.body.variants)) {
        try {
          req.body.variants = JSON.parse(req.body.variants);
        } catch (err) {
          return res.status(400).json({ message: 'Invalid variants data' });
        }
      }

      // Process variants with potential new color images or individual variant images
      req.body.variants = await Promise.all(req.body.variants.map(async (v, i) => {
        const color = (v.color || '').trim();
        let variantImageUrl = colorImageMap[color] || v.image || product.image;

        // Check for individual variant image upload (e.g. variantImage_0, variantImage_1, ...)
        const variantImageFile = req.files?.find(f => f.fieldname === `variantImage_${i}`);
        if (variantImageFile) {
          try {
            variantImageUrl = await uploadFile(variantImageFile);
          } catch (err) {
            console.error(`Failed to upload individual image for variant ${i}:`, err);
          }
        }

        return {
          ...v,
          color: color || null,
          price: Number(v.price) || Number(req.body.price) || product.price,
          stock: Number(v.stock) || 0,
          discount: Number(v.discount) || 0,
          image: variantImageUrl
        };
      }));

      // Synchronize top-level fields with first variant
      const primaryVariant = req.body.variants[0];
      if (primaryVariant) {
        req.body.size = primaryVariant.size;
        req.body.color = primaryVariant.color;
        req.body.price = primaryVariant.price;
        req.body.discount = primaryVariant.discount;
        req.body.image = primaryVariant.image;
        req.body.imageUrl = primaryVariant.image;
        req.body.stock = req.body.variants.reduce((sum, v) => sum + v.stock, 0);
      }
    }

    // Handle bestseller status: if marking as bestseller and product has variantGroupId,
    // mark all variants in the group as bestseller (Legacy/Separate docs support)
    const isMarkingBestseller = req.body.isBestseller === 'true' || req.body.isBestseller === true;
    const bestsellerCategory = req.body.bestsellerCategory || product.bestsellerCategory;

    if (isMarkingBestseller && product.variantGroupId) {
      await Product.updateMany(
        { variantGroupId: product.variantGroupId },
        { isBestseller: true, bestsellerCategory: bestsellerCategory, updatedAt: Date.now() }
      );
    } else if (req.body.isBestseller === 'false' || req.body.isBestseller === false) {
      if (product.variantGroupId) {
        await Product.updateMany(
          { variantGroupId: product.variantGroupId },
          { isBestseller: false, bestsellerCategory: null, updatedAt: Date.now() }
        );
      }
    }

    // Sync color/image for separate variant documents (Legacy support)
    const newColor = (req.body.color || product.color || '').trim();
    const newImage = req.body.image || product.image;

    if (product.variantGroupId && (req.body.color !== undefined || req.body.image !== undefined)) {
      await Product.updateMany(
        { variantGroupId: product.variantGroupId, color: newColor, _id: { $ne: product._id } },
        { image: newImage, imageUrl: newImage, updatedAt: Date.now() }
      );
    }

    Object.assign(product, req.body);
    product.updatedAt = Date.now();

    // Handle slug changes for SEO
    const oldSlug = product.slug;
    if (req.body.itemName || req.body.company || req.body.size || req.body.color) {
      const newSlug = await SlugService.generateUniqueSlug(
        req.body.itemName || product.itemName,
        req.body.company || product.company,
        req.body.size || product.size,
        req.body.color || product.color,
        product._id
      );

      if (oldSlug && oldSlug !== newSlug) {
        await SlugService.handleSlugChange(product._id, oldSlug, newSlug);
      }

      product.slug = newSlug;
    }

    const updatedProduct = await product.save();

    // Add debug info if requested or always for now
    const responseData = updatedProduct.toObject();
    responseData.debugFieldnames = req.files?.map(f => f.fieldname);

    // Trigger SEO services after product update
    setImmediate(async () => {
      try {
        // Notify Google Indexing API
        if (product.slug && product.isActive) {
          await googleIndexingService.indexProduct(product.slug, product.categoryName);
        }

        // Regenerate sitemap (async, non-blocking)
        await sitemapService.regenerateAndNotify();
      } catch (error) {
        console.error('SEO service error after product update:', error);
      }
    });

    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get product by slug or redirect
router.get('/slug/:slug', async (req, res) => {
  try {
    const { product, redirected, newSlug } = await SlugService.findBySlugOrRedirect(req.params.slug);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (redirected && newSlug) {
      // Return redirect information
      return res.json({
        product,
        redirected: true,
        newSlug,
        redirectUrl: `/api/products/slug/${newSlug}`
      });
    }

    res.json({ product, redirected: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
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