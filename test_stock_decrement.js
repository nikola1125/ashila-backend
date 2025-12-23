const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./models/Product');
const Order = require('./models/Order');

async function testStockDecrement() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Find a test product with variants
    const testProduct = await Product.findOne({ itemName: /cleanser/i });
    if (!testProduct) {
      console.log('No cleanser product found');
      return;
    }

    console.log('Test product found:', {
      id: testProduct._id,
      name: testProduct.itemName,
      size: testProduct.size,
      stock: testProduct.stock
    });

    // Find all variants of this product
    const allVariants = await Product.find({ 
      itemName: testProduct.itemName 
    });

    console.log('\nAll variants:');
    allVariants.forEach(v => {
      console.log(`- ${v.size}: ${v.stock} units`);
    });

    // Find a recent order
    const recentOrder = await Order.findOne({ 
      'items.itemName': /cleanser/i 
    }).sort({ createdAt: -1 });

    if (!recentOrder) {
      console.log('\nNo recent order found for cleanser');
      return;
    }

    console.log('\nRecent order:', {
      id: recentOrder._id,
      status: recentOrder.status,
      items: recentOrder.items.map(item => ({
        name: item.itemName,
        size: item.selectedSize,
        quantity: item.quantity
      }))
    });

    // Check if stock update should have happened
    const cleanserItems = recentOrder.items.filter(item => 
      item.itemName.toLowerCase().includes('cleanser')
    );

    console.log('\nExpected stock updates:');
    cleanserItems.forEach(item => {
      console.log(`- Size: ${item.selectedSize}, Qty: ${item.quantity}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testStockDecrement();
