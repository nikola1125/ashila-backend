const Product = require('../models/Product');
const SlugRedirect = require('../models/SlugRedirect');

class SlugService {
  /**
   * Generate unique slug for a product
   */
  static async generateUniqueSlug(productName, company, size, color, productId = null) {
    const baseSlug = this.createSlug(productName, company, size, color);
    let uniqueSlug = baseSlug;
    let counter = 1;

    // Check if slug already exists (excluding current product if updating)
    while (true) {
      const existingProduct = await Product.findOne({
        slug: uniqueSlug,
        ...(productId && { _id: { $ne: productId } })
      });

      if (!existingProduct) {
        break;
      }

      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Create slug from product details
   */
  static createSlug(productName, company, size, color) {
    if (!productName) return '';

    let slug = productName
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    if (company && company !== productName) {
      slug += `-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    }

    if (size) {
      slug += `-${size.toLowerCase().replace(/\s+/g, '-')}`;
    }

    if (color) {
      slug += `-${color.toLowerCase().replace(/\s+/g, '-')}`;
    }

    return slug;
  }

  /**
   * Handle slug change - create redirect if needed
   */
  static async handleSlugChange(productId, oldSlug, newSlug) {
    if (!oldSlug || oldSlug === newSlug) {
      return;
    }

    // Create redirect from old slug to new slug
    await SlugRedirect.create({
      oldSlug,
      newSlug,
      productId
    });

    console.log(`Created redirect: ${oldSlug} -> ${newSlug} for product ${productId}`);
  }

  /**
   * Find product by slug or redirect
   */
  static async findBySlugOrRedirect(slug) {
    // First try to find product by slug
    let product = await Product.findOne({ slug, isActive: true });

    if (product) {
      return { product, redirected: false };
    }

    // If not found, check for redirect
    const redirect = await SlugRedirect.findOne({ oldSlug: slug });

    if (redirect) {
      // Find product by new slug
      product = await Product.findOne({ slug: redirect.newSlug, isActive: true });

      if (product) {
        return { product, redirected: true, newSlug: redirect.newSlug };
      }
    }

    return { product: null, redirected: false };
  }

  /**
   * Clean up expired redirects
   */
  static async cleanupExpiredRedirects() {
    const result = await SlugRedirect.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    console.log(`Cleaned up ${result.deletedCount} expired redirects`);
    return result.deletedCount;
  }

  /**
   * Update all products without slugs
   */
  static async updateProductSlugs() {
    const productsWithoutSlug = await Product.find({ slug: { $exists: false } });

    console.log(`Found ${productsWithoutSlug.length} products without slugs`);

    for (const product of productsWithoutSlug) {
      const uniqueSlug = await this.generateUniqueSlug(
        product.itemName,
        product.company,
        product.size,
        product.color,
        product._id
      );

      product.slug = uniqueSlug;
      await product.save();

      console.log(`Generated slug for product ${product.itemName}: ${uniqueSlug}`);
    }

    return productsWithoutSlug.length;
  }

  /**
   * Get redirect mapping for sitemap
   */
  static async getRedirectMappings() {
    const redirects = await SlugRedirect.find({})
      .populate('productId', 'itemName')
      .lean();

    return redirects.map(r => ({
      from: r.oldSlug,
      to: r.newSlug,
      productName: r.productId?.itemName || 'Unknown'
    }));
  }
}

module.exports = SlugService;
