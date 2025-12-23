const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');

// Load environment variables
require('dotenv').config();

async function testStockUpdate() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medi-mart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find a pending order
    const pendingOrder = await Order.findOne({ status: 'Pending' }).populate('items.productId');
    
    if (!pendingOrder) {
      console.log('No pending orders found for testing');
      return;
    }

    console.log(`Testing with order: ${pendingOrder.orderNumber}`);
    console.log('Items in order:');
    
    // Log current stock levels
    for (const item of pendingOrder.items) {
      const product = item.productId;
      if (item.selectedSize && product.variants) {
        const variant = product.variants.find(v => v.size === item.selectedSize);
        console.log(`- ${item.itemName} (${item.selectedSize}): ${variant?.stock || 0} in stock`);
      } else {
        console.log(`- ${item.itemName}: ${product.stock} in stock`);
      }
    }

    // Simulate order confirmation
    console.log('\nSimulating order confirmation...');
    
    const oldStatus = pendingOrder.status;
    pendingOrder.status = 'Confirmed';
    await pendingOrder.save();

    // Update stock manually (same logic as in orders.js)
    for (const item of pendingOrder.items) {
      console.log(`Updating stock for: ${item.itemName} | Size: ${item.selectedSize} | Qty: ${item.quantity}`);
      
      try {
        let updateResult;
        if (item.selectedSize) {
          updateResult = await Product.findOneAndUpdate(
            { _id: item.productId, "variants.size": item.selectedSize },
            { $inc: { "variants.$.stock": -item.quantity } },
            { new: true }
          );
        } else {
          updateResult = await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity } },
            { new: true }
          );
        }

        if (!updateResult) {
          console.error(`ERROR: Product not found: ${item.productId} | Size: ${item.selectedSize}`);
        } else {
          const newStock = item.selectedSize 
            ? updateResult.variants.find(v => v.size === item.selectedSize)?.stock 
            : updateResult.stock;
          console.log(`SUCCESS: Updated product: ${updateResult.itemName} | New stock: ${newStock}`);
        }
      } catch (stockError) {
        console.error(`ERROR: Failed to update stock for item: ${item.itemName} | Error: ${stockError.message}`);
      }
    }

    console.log('\nStock update test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testStockUpdate();
