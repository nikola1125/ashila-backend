const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');

require('dotenv').config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const orders = await Order.find({});
    console.log(`Total orders: ${orders.length}`);
    
    orders.forEach(order => {
      console.log(`Order: ${order.orderNumber}, Status: ${order.status}, Items: ${order.items.length}`);
    });

    // Check products with stock
    const products = await Product.find({}).limit(5);
    console.log('\nSample products:');
    products.forEach(product => {
      console.log(`${product.itemName}: Stock ${product.stock}`);
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          console.log(`  - Variant ${variant.size}: Stock ${variant.stock}`);
        });
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrders();
