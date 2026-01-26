require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const SlugService = require('../services/SlugService');

/**
 * Script to update all product slugs for SEO
 * Run with: npm run seo:update-slugs
 */
async function updateAllSlugs() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Updating product slugs...');
    const updatedCount = await SlugService.updateProductSlugs();
    
    console.log(`✅ Updated ${updatedCount} product slugs`);
    
    // Generate sitemap after slug updates
    const sitemapService = require('../services/SitemapService');
    console.log('🔄 Regenerating sitemap...');
    await sitemapService.regenerateAndNotify();
    console.log('✅ Sitemap regenerated');

    console.log('🎉 Slug update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating slugs:', error);
    process.exit(1);
  }
}

updateAllSlugs();
