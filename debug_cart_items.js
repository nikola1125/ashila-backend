const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./models/Product');
const Order = require('./models/Order');

async function debugCartItems() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Find all recent orders
    const recentOrders = await Order.find({ 
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(5);

    console.log(`\nFound ${recentOrders.length} recent orders:`);

    recentOrders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log(`ID: ${order._id}`);
      console.log(`Status: ${order.status}`);
      console.log(`Created: ${order.createdAt}`);
      console.log('Items:');
      
      order.items.forEach((item, itemIndex) => {
        console.log(`  ${itemIndex + 1}. ${item.itemName}`);
        console.log(`     - Product ID: ${item.productId}`);
        console.log(`     - Selected Size: ${item.selectedSize}`);
        console.log(`     - Quantity: ${item.quantity}`);
        console.log(`     - Price: ${item.price}`);
      });
    });

    // Check if we can find the actual product documents
    if (recentOrders.length > 0) {
      const firstOrder = recentOrders[0];
      console.log(`\n\nChecking products for first order:`);
      
      for (const item of firstOrder.items) {
        console.log(`\nLooking for product: ${item.productId}`);
        
        // Try to find by ID
        const product = await Product.findById(item.productId);
        if (product) {
          console.log(`Found: ${product.itemName} - Size: ${product.size} - Stock: ${product.stock}`);
        } else {
          console.log('Product not found by ID');
          
          // Try to find by name and size
          const foundProduct = await Product.findOne({ 
            itemName: item.itemName,
            size: item.selectedSize 
          });
          
          if (foundProduct) {
            console.log(`Found by name+size: ${foundProduct.itemName} - Size: ${foundProduct.size} - Stock: ${foundProduct.stock}`);
          } else {
            console.log('Product not found by name+size either');
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugCartItems();
