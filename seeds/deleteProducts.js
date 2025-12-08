const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const deleteProducts = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env file');
      process.exit(1);
    }
    
    // Ensure database name is included
    let connectionString = MONGODB_URI.trim();
    if (!connectionString.endsWith('/') && !connectionString.includes('?')) {
      if (!connectionString.match(/\/[^\/\?]+(\?|$)/)) {
        connectionString = connectionString.endsWith('/') 
          ? connectionString + 'medi-mart' 
          : connectionString + '/medi-mart';
      }
    }
    
    await mongoose.connect(connectionString);
    console.log('✓ Connected to MongoDB');

    // Delete all products
    const result = await Product.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} products from the database`);
    
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting products:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

deleteProducts();

