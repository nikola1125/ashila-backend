require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const googleIndexingService = require('../services/GoogleIndexingService');

/**
 * Script to index products in Google
 * Run with: npm run seo:index
 */
async function indexInGoogle() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    if (!googleIndexingService.isAvailable()) {
      console.log('❌ Google Indexing API not configured');
      console.log('Please set GOOGLE_SERVICE_ACCOUNT_KEY in your .env file');
      process.exit(1);
    }

    console.log('🔄 Fetching active products...');
    const products = await Product.find({ isActive: true })
      .select('itemName slug categoryName company')
      .limit(100) // Limit to avoid rate limiting
      .lean();

    console.log(`📊 Found ${products.length} products to index`);

    let successCount = 0;
    let failureCount = 0;

    for (const product of products) {
      if (product.slug) {
        try {
          const success = await googleIndexingService.indexProduct(
            product.slug, 
            product.categoryName
          );
          
          if (success) {
            successCount++;
            console.log(`✅ Indexed: ${product.itemName}`);
          } else {
            failureCount++;
            console.log(`❌ Failed: ${product.itemName}`);
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          failureCount++;
          console.error(`❌ Error indexing ${product.itemName}:`, error.message);
        }
      }
    }

    console.log(`\n📈 Indexing Summary:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📊 Total: ${products.length}`);

    console.log('🎉 Google indexing completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during Google indexing:', error);
    process.exit(1);
  }
}

indexInGoogle();
