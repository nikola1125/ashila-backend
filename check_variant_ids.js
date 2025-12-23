const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

async function checkVariantIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Find all Bright-C Cleanser variants
    const cleansers = await Product.find({ itemName: 'Bright-C Cleanser' });
    
    console.log('Bright-C Cleanser variants:');
    cleansers.forEach(cleaner => {
      console.log(`ID: ${cleaner._id}`);
      console.log(`Size: ${cleaner.size}`);
      console.log(`Price: ${cleaner.price}`);
      console.log(`Stock: ${cleaner.stock}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkVariantIds();
