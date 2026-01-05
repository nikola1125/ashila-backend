const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

async function migrateCategoryPaths() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medimart');
    console.log('Connected.');

    const products = await Product.find({});
    console.log(`Found ${products.length} products to check.`);

    let updatedCount = 0;

    for (const product of products) {
        let changed = false;

        // Clean subcategory - ensure no nulls and trim
        if (product.subcategory) {
            product.subcategory = product.subcategory.trim();
        }

        // Clean options array - ensure strings and trim
        if (product.options && product.options.length > 0) {
            product.options = product.options.map(opt => typeof opt === 'string' ? opt.trim() : String(opt));
        }

        // recalculate category path correctly
        // Format: "Category > Subcategory > Option1, Option2"
        if (product.categoryName && product.subcategory) {
            // Get base category name (the string before the first ' > ')
            const baseCategory = product.categoryName.split(' > ')[0].trim();
            
            let newPath = `${baseCategory} > ${product.subcategory}`;
            if (product.options && product.options.length > 0) {
                newPath += ` > ${product.options.join(', ')}`;
            }

            if (product.categoryName !== newPath) {
                console.log(`Updating [${product.itemName}]: "${product.categoryName}" -> "${newPath}"`);
                product.categoryName = newPath;
                changed = true;
            }
        }

        if (changed) {
            await product.save();
            updatedCount++;
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateCategoryPaths();
