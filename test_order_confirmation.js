const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');

require('dotenv').config();

async function testOrderConfirmation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a confirmed order to check its items
    const confirmedOrder = await Order.findOne({ status: 'Confirmed' }).populate('items.productId');
    
    if (!confirmedOrder) {
      console.log('No confirmed orders found');
      return;
    }

    console.log(`Testing with confirmed order: ${confirmedOrder.orderNumber}`);
    console.log('Items and current stock levels:');
    
    for (const item of confirmedOrder.items) {
      const product = item.productId;
      console.log(`\nItem: ${item.itemName}`);
      console.log(`Quantity ordered: ${item.quantity}`);
      console.log(`Selected size: ${item.selectedSize || 'N/A'}`);
      
      if (item.selectedSize && product.variants) {
        const variant = product.variants.find(v => v.size === item.selectedSize);
        console.log(`Current variant stock: ${variant?.stock || 'Not found'}`);
      } else {
        console.log(`Current product stock: ${product.stock}`);
      }
    }

    // Now let's manually test the stock update logic
    console.log('\n=== Testing stock update logic ===');
    
    for (const item of confirmedOrder.items) {
      console.log(`\nProcessing: ${item.itemName} | Size: ${item.selectedSize} | Qty: ${item.quantity}`);
      
      try {
        let updateResult;
        if (item.selectedSize) {
          console.log('Updating variant stock...');
          updateResult = await Product.findOneAndUpdate(
            { _id: item.productId, "variants.size": item.selectedSize },
            { $inc: { "variants.$.stock": -item.quantity } },
            { new: true }
          );
        } else {
          console.log('Updating main product stock...');
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
          console.log(`SUCCESS: New stock level: ${newStock}`);
        }
      } catch (stockError) {
        console.error(`ERROR: Failed to update stock: ${stockError.message}`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testOrderConfirmation();
