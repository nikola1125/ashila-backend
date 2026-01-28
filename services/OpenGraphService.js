const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class OpenGraphService {
  constructor() {
    this.outputDir = path.join(__dirname, '../public/og-images');
    this.defaultTemplate = path.join(__dirname, '../assets/og-template.png');
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate dynamic OG image for product
   */
  async generateProductOGImage(product) {
    try {
      const filename = `product-${product._id}.png`;
      const outputPath = path.join(this.outputDir, filename);
      
      // Check if image already exists and is recent
      try {
        const stats = await fs.stat(outputPath);
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        if (ageHours < 24) {
          return `/og-images/${filename}`;
        }
      } catch {
        // File doesn't exist, continue with generation
      }

      // Generate new OG image
      await this.createOGImage({
        title: product.itemName,
        subtitle: product.company || 'Farmaci Ashila',
        price: `${product.price} ALL`,
        category: product.categoryName || 'Mjekësi',
        outputPath,
        productImage: product.image || product.imageUrl
      });

      return `/og-images/${filename}`;
    } catch (error) {
      console.error('Error generating OG image for product:', error);
      return '/images/og-default.png';
    }
  }

  /**
   * Generate OG image for category
   */
  async generateCategoryOGImage(category, productCount) {
    try {
      const filename = `category-${category._id}.png`;
      const outputPath = path.join(this.outputDir, filename);
      
      // Check if image already exists and is recent
      try {
        const stats = await fs.stat(outputPath);
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        if (ageHours < 168) { // 1 week for categories
          return `/og-images/${filename}`;
        }
      } catch {
        // File doesn't exist, continue with generation
      }

      await this.createOGImage({
        title: category.categoryName,
        subtitle: `${productCount} Produkte`,
        category: 'Kategori',
        outputPath,
        isCategory: true
      });

      return `/og-images/${filename}`;
    } catch (error) {
      console.error('Error generating OG image for category:', error);
      return '/images/og-default.png';
    }
  }

  /**
   * Create OG image using Sharp
   */
  async createOGImage(options) {
    const {
      title,
      subtitle,
      price,
      category,
      outputPath,
      productImage,
      isCategory = false
    } = options;

    // OG image dimensions
    const width = 1200;
    const height = 630;

    try {
      // Create a canvas with the brand colors
      let svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#A67856;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#8B5A3C;stop-opacity:1" />
            </linearGradient>
            <filter id="shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.2"/>
            </filter>
          </defs>
          
          <!-- Background -->
          <rect width="100%" height="100%" fill="url(#bg)"/>
          
          <!-- White content area -->
          <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="20" fill="white" filter="url(#shadow)"/>
          
          <!-- Logo placeholder -->
          <circle cx="100" cy="100" r="40" fill="#A67856" opacity="0.1"/>
          <text x="100" y="105" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#A67856">FS</text>
          
          <!-- Main title -->
          <text x="100" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#2D3748">
            ${this.truncateText(title, 25)}
          </text>
          
          <!-- Subtitle -->
          <text x="100" y="250" font-family="Arial, sans-serif" font-size="24" fill="#4A5568">
            ${subtitle}
          </text>
          
          <!-- Category badge -->
          <rect x="100" y="280" width="150" height="40" rx="20" fill="#A67856" opacity="0.2"/>
          <text x="175" y="305" font-family="Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="#A67856">
            ${category}
          </text>
          
          ${price ? `
            <!-- Price -->
            <rect x="100" y="340" width="120" height="50" rx="10" fill="#48BB78"/>
            <text x="160" y="375" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="white">
              ${price}
            </text>
          ` : ''}
          
          <!-- Footer -->
          <text x="${width - 100}" y="${height - 60}" font-family="Arial, sans-serif" font-size="16" text-anchor="end" fill="#718096">
            farmaciashila.com
          </text>
          
          ${isCategory ? `
            <!-- Category icon -->
            <circle cx="${width - 100}" cy="100" r="30" fill="#A67856" opacity="0.1"/>
            <text x="${width - 100}" y="110" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#A67856">📦</text>
          ` : ''}
        </svg>
      `;

      // Convert SVG to PNG using Sharp
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);

      console.log(`Generated OG image: ${outputPath}`);
    } catch (error) {
      console.error('Error creating OG image:', error);
      throw error;
    }
  }

  /**
   * Truncate text to fit in OG image
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate default OG image
   */
  async generateDefaultOGImage() {
    const outputPath = path.join(this.outputDir, 'og-default.png');
    
    try {
      await fs.access(outputPath);
      return '/og-images/og-default.png';
    } catch {
      await this.createOGImage({
        title: 'Farmaci Ashila',
        subtitle: 'Kujdes Shëndetësor & Produkte Mjekësore',
        category: 'Farmaci Online në Shqipëri',
        outputPath,
        isDefault: true
      });
      
      return '/og-images/og-default.png';
    }
  }

  /**
   * Clean up old OG images
   */
  async cleanupOldImages(maxAge = 30) {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        if (file === 'og-default.png') continue; // Keep default image
        
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        const ageDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (ageDays > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} old OG images`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up OG images:', error);
      return 0;
    }
  }

  /**
   * Get OG image URL for product
   */
  async getProductOGUrl(product) {
    if (!product) return '/images/og-default.png';
    
    try {
      return await this.generateProductOGImage(product);
    } catch (error) {
      console.error('Error getting product OG URL:', error);
      return '/images/og-default.png';
    }
  }

  /**
   * Get OG image URL for category
   */
  async getCategoryOGUrl(category, productCount = 0) {
    if (!category) return '/images/og-default.png';
    
    try {
      return await this.generateCategoryOGImage(category, productCount);
    } catch (error) {
      console.error('Error getting category OG URL:', error);
      return '/images/og-default.png';
    }
  }
}

// Singleton instance
const openGraphService = new OpenGraphService();

module.exports = openGraphService;
