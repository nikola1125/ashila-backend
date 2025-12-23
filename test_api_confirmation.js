const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');

require('dotenv').config();

async function testAPIConfirmation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a pending order to test with
    const pendingOrder = await Order.findOne({ status: 'Pending' }).populate('items.productId');
    
    if (!pendingOrder) {
      console.log('No pending orders found. Creating a test scenario...');
      
      // Let's find an order and change it back to pending for testing
      const confirmedOrder = await Order.findOne({ status: 'Confirmed' }).populate('items.productId');
      if (confirmedOrder) {
        console.log(`Reverting order ${confirmedOrder.orderNumber} to Pending for testing...`);
        confirmedOrder.status = 'Pending';
        await confirmedOrder.save();
        
        // Restore stock for testing
        for (const item of confirmedOrder.items) {
          if (item.selectedSize) {
            await Product.findOneAndUpdate(
              { _id: item.productId, "variants.size": item.selectedSize },
              { $inc: { "variants.$.stock": item.quantity } }
            );
          } else {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { stock: item.quantity } }
            );
          }
        }
        
        console.log('Order reverted to Pending and stock restored. Now testing...');
        await testOrderConfirmationLogic(confirmedOrder._id);
      }
    } else {
      console.log(`Testing with pending order: ${pendingOrder.orderNumber}`);
      await testOrderConfirmationLogic(pendingOrder._id);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

async function testOrderConfirmationLogic(orderId) {
  try {
    // This simulates the exact logic in the PATCH /orders/:id endpoint
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('Order not found');
      return;
    }

    const oldStatus = order.status;
    console.log(`Current order status: ${oldStatus}`);

    // Simulate the status update
    Object.assign(order, { status: 'Confirmed' });
    order.updatedAt = Date.now();
    const updatedOrder = await order.save();
    
    console.log(`Order status updated to: ${updatedOrder.status}`);

    // Check if status changed to 'Confirmed' (this is the critical part)
    if (oldStatus !== 'Confirmed' && updatedOrder.status === 'Confirmed') {
      console.log('=== STOCK UPDATE TRIGGERED ===');
      
      // 1. Decrement Stock
      const Product = require('./models/Product');
      for (const item of order.items) {
        console.log(`[Stock Update] Confirming item: ${item.itemName} | Size: ${item.selectedSize} | Qty: ${item.quantity}`);

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
            console.error(`[Stock Update Error] Product not found: ${item.productId} | Size: ${item.selectedSize}`);
          } else {
            console.log(`[Stock Update Success] Updated product: ${updateResult.itemName} | New stock: ${item.selectedSize ? updateResult.variants.find(v => v.size === item.selectedSize)?.stock : updateResult.stock}`);
          }
        } catch (stockError) {
          console.error(`[Stock Update Error] Failed to update stock for item: ${item.itemName} | Error: ${stockError.message}`);
        }
      }
    } else {
      console.log('Stock update NOT triggered - condition not met');
      console.log(`oldStatus: ${oldStatus}, newStatus: ${updatedOrder.status}`);
    }

  } catch (error) {
    console.error('API test error:', error);
  }
}

testAPIConfirmation();
