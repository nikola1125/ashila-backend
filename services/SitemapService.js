const Product = require('../models/Product');
const Category = require('../models/Category');
const SlugRedirect = require('../models/SlugRedirect');
const googleIndexingService = require('./GoogleIndexingService');

class SitemapService {
  constructor() {
    this.baseUrl = 'https://www.farmaciashila.com';
    this.staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/shop', priority: '0.9', changefreq: 'daily' },
      { url: '/contact-us', priority: '0.5', changefreq: 'monthly' },
      { url: '/about-us', priority: '0.6', changefreq: 'monthly' },
      { url: '/kerko', priority: '0.8', changefreq: 'weekly' }
    ];
  }

  /**
   * Generate complete sitemap with all products and categories
   */
  async generateSitemap() {
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const today = new Date().toISOString().split('T')[0];

    // Add static pages
    this.staticPages.forEach(page => {
      sitemap += this.createUrlEntry({
        loc: `${this.baseUrl}${page.url}`,
        lastmod: today,
        changefreq: page.changefreq,
        priority: page.priority
      });
    });

    try {
      // Add product pages with SEO-friendly URLs
      const products = await Product.find({ isActive: true })
        .populate('category', 'categoryName')
        .lean();

      for (const product of products) {
        if (this.isInvalidProduct(product)) continue;

        const productEntry = this.createProductEntry(product, today);
        sitemap += productEntry;
      }

      // Add category pages
      const categories = await Category.find().lean();
      
      for (const category of categories) {
        const categoryEntry = this.createCategoryEntry(category, today);
        sitemap += categoryEntry;
      }

    } catch (error) {
      console.error('Error generating dynamic sitemap content:', error);
    }

    sitemap += '</urlset>';
    return sitemap;
  }

  /**
   * Create URL entry for sitemap
   */
  createUrlEntry({ loc, lastmod, changefreq, priority }) {
    let entry = '  <url>\n';
    entry += `    <loc>${loc}</loc>\n`;
    entry += `    <lastmod>${lastmod}</lastmod>\n`;
    entry += `    <changefreq>${changefreq}</changefreq>\n`;
    entry += `    <priority>${priority}</priority>\n`;
    entry += '  </url>\n';
    return entry;
  }

  /**
   * Create product entry with SEO-friendly URL
   */
  createProductEntry(product, today) {
    const categoryName = product.category?.categoryName || 'mjekesi';
    const categorySlug = this.createSlug(categoryName);
    const productSlug = product.slug || this.createSlug(product.itemName, product.company, product.size);
    
    const url = `${this.baseUrl}/produkte/${categorySlug}/${productSlug}`;
    const lastmod = product.updatedAt ? 
      new Date(product.updatedAt).toISOString().split('T')[0] : 
      today;

    return this.createUrlEntry({
      loc: url,
      lastmod,
      changefreq: 'weekly',
      priority: '0.7'
    });
  }

  /**
   * Create category entry
   */
  createCategoryEntry(category, today) {
    const categorySlug = this.createSlug(category.categoryName);
    const url = `${this.baseUrl}/kategoria/${categorySlug}`;
    const lastmod = category.updatedAt ? 
      new Date(category.updatedAt).toISOString().split('T')[0] : 
      today;

    return this.createUrlEntry({
      loc: url,
      lastmod,
      changefreq: 'weekly',
      priority: '0.8'
    });
  }

  /**
   * Check if product is invalid/test data
   */
  isInvalidProduct(product) {
    const productName = product.itemName || product.genericName || '';
    
    // Filter out test data
    const gibberishPatterns = [
      /^[asdfghjkl]{5,}$/i,
      /^[qwertyuiop]{5,}$/i,
      /^[zxcvbnm]{5,}$/i,
      /test/i,
      /^[^a-z0-9]+$/i,
      /(.)\1{4,}/,
      /^[0-9]+$/,
      /medicine\s*[0-9]*/i,
      /item\s*[0-9]*/i
    ];

    return gibberishPatterns.some(pattern => pattern.test(productName)) || 
           product.price <= 0;
  }

  /**
   * Create slug from text
   */
  createSlug(text, company = '', size = '') {
    if (!text) return '';
    
    let slug = text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    if (company && company !== text) {
      slug += `-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    }
    
    if (size) {
      slug += `-${size.toLowerCase().replace(/\s+/g, '-')}`;
    }

    return slug;
  }

  /**
   * Generate robots.txt
   */
  generateRobotsTxt() {
    let robots = `User-agent: *\n`;
    robots += `Allow: /\n`;
    robots += `Disallow: /admin/\n`;
    robots += `Disallow: /api/\n`;
    robots += `Disallow: /checkout/\n`;
    robots += `Disallow: /profile/\n`;
    robots += `Disallow: /cart/\n`;
    robots += `Disallow: /*?search=\n`;
    robots += `Disallow: /*?filter=\n`;
    robots += `Disallow: /*.json$\n\n`;
    
    robots += `# Sitemap location\n`;
    robots += `Sitemap: ${this.baseUrl}/sitemap.xml\n\n`;
    
    robots += `# Crawl delay for respectful crawling\n`;
    robots += `Crawl-delay: 1\n\n`;
    
    robots += `# Specific bots\n`;
    robots += `User-agent: Googlebot\n`;
    robots += `Allow: /\n\n`;
    
    robots += `User-agent: Bingbot\n`;
    robots += `Allow: /\n\n`;
    
    robots += `# YMYL compliance - medical content\n`;
    robots += `User-agent: *\n`;
    robots += `Allow: /produkte/\n`;
    robots += `Allow: /kategoria/\n`;
    robots += `Allow: /kerko\n`;

    return robots;
  }

  /**
   * Regenerate sitemap and notify Google
   */
  async regenerateAndNotify() {
    try {
      // Generate new sitemap
      const sitemap = await this.generateSitemap();
      
      // Notify Google Indexing API about important pages
      if (googleIndexingService.isAvailable()) {
        // Index homepage
        await googleIndexingService.indexHomepage();
        
        // Index a few key product pages (to avoid rate limiting)
        const recentProducts = await Product.find({ isActive: true })
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean();
          
        for (const product of recentProducts) {
          if (product.slug) {
            await googleIndexingService.indexProduct(product.slug, product.categoryName);
          }
        }
      }
      
      return sitemap;
    } catch (error) {
      console.error('Error regenerating sitemap:', error);
      throw error;
    }
  }

  /**
   * Get sitemap statistics
   */
  async getSitemapStats() {
    try {
      const [productCount, categoryCount] = await Promise.all([
        Product.countDocuments({ isActive: true }),
        Category.countDocuments()
      ]);

      return {
        staticPages: this.staticPages.length,
        products: productCount,
        categories: categoryCount,
        total: this.staticPages.length + productCount + categoryCount,
        lastGenerated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting sitemap stats:', error);
      return null;
    }
  }
}

module.exports = new SitemapService();
