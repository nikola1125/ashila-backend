const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

async function debugProducts() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medimart');
    console.log('Connected.');

    const products = await Product.find({}).limit(5);
    products.forEach(p => {
        console.log('Item:', p.itemName);
        console.log('  categoryName:', p.categoryName);
        console.log('  subcategory:', p.subcategory);
        console.log('  options:', p.options);
        console.log('---');
    });

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

debugProducts();
