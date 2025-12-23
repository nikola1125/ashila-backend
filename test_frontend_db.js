const mongoose = require('mongoose');
const Product = require('./models/Product');

require('dotenv').config();

async function testFrontendDB() {
  try {
    // Connect to the same database the server uses
    const MONGODB_URI = process.env.MONGODB_URI;
    let connectionString = MONGODB_URI.trim();
    
    if (!connectionString.endsWith('/') && !connectionString.includes('?')) {
      if (!connectionString.match(/\/[^\/\?]+(\?|$)/)) {
        connectionString = connectionString.endsWith('/')
          ? connectionString + 'test'
          : connectionString + '/test';
      }
    }
    
    await mongoose.connect(connectionString);
    console.log('Connected to database:', mongoose.connection.name);
    
    // Find Bright-C Cleanser
    const product = await Product.findOne({ itemName: 'Bright-C Cleanser' });
    
    if (product) {
      console.log('\n=== PRODUCT FOUND ===');
      console.log('Name:', product.itemName);
      console.log('Stock in server database:', product.stock);
      console.log('Product ID:', product._id);
      
      if (product.variants && product.variants.length > 0) {
        console.log('\nVariants:');
        product.variants.forEach(variant => {
          console.log(`  - ${variant.size}: Stock ${variant.stock}`);
        });
      }
    } else {
      console.log('Bright-C Cleanser not found in server database');
    }
    
    // Now let's also check if there are other databases
    console.log('\n=== CHECKING OTHER POSSIBLE DATABASES ===');
    
    // Try connecting to medi-mart database
    await mongoose.disconnect();
    const mediMartConnection = MONGODB_URI + '/medi-mart';
    await mongoose.connect(mediMartConnection);
    console.log('Connected to medi-mart database');
    
    const productInMediMart = await Product.findOne({ itemName: 'Bright-C Cleanser' });
    if (productInMediMart) {
      console.log('Stock in medi-mart database:', productInMediMart.stock);
    } else {
      console.log('Bright-C Cleanser not found in medi-mart database');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testFrontendDB();
