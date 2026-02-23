srequire('dotenv').config();
const mongoose = require('mongoose');
const SlugService = require('../services/SlugService');
const openGraphService = require('../services/OpenGraphService');

/**
 * Script to clean up SEO-related data
 * Run with: npm run seo:cleanup
 */
async function cleanupSEO() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Cleaning up expired redirects...');
    const deletedRedirects = await SlugService.cleanupExpiredRedirects();
    console.log(`✅ Cleaned up ${deletedRedirects} expired redirects`);

    console.log('🧹 Cleaning up old OG images...');
    const deletedImages = await openGraphService.cleanupOldImages();
    console.log(`✅ Cleaned up ${deletedImages} old OG images`);

    // Regenerate sitemap after cleanup
    const sitemapService = require('../services/SitemapService');
    console.log('🔄 Regenerating sitemap...');
    await sitemapService.regenerateAndNotify();
    console.log('✅ Sitemap regenerated');

    console.log('🎉 SEO cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during SEO cleanup:', error);
    process.exit(1);
  }
}

cleanupSEO();
