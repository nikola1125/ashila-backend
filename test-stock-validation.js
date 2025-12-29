const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// Test stock validation scenarios
const testStockValidation = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a product with limited stock
    const testProduct = await Product.findOne({ itemName: /test/i }) || new Product({
      itemName: 'Test Stock Product',
      price: 100,
      stock: 7, // Only 7 items available
      categoryName: 'Test Category',
      seller: new mongoose.Types.ObjectId(),
      isActive: true
    });

    await testProduct.save();
    console.log(`✅ Created test product with ${testProduct.stock} items in stock`);

    // Test 2: Simulate order with quantity exceeding stock
    const orderItems = [
      {
        productId: testProduct._id,
        itemName: testProduct.itemName,
        quantity: 10, // Trying to order 10 when only 7 available
        price: testProduct.price,
        discount: 0
      }
    ];

    console.log(`🧪 Testing order with ${orderItems[0].quantity} items (stock: ${testProduct.stock})`);

    // Simulate the stock validation logic from orders.js
    const stockCheck = async (item) => {
      const product = await Product.findById(item.productId);
      if (!product) {
        return { error: 'Product not found' };
      }

      const availableStock = Number(product.stock) || 0;
      const requestedQuantity = Number(item.quantity) || 0;

      if (requestedQuantity > availableStock) {
        return {
          itemName: item.itemName,
          requestedQuantity,
          availableStock,
          error: 'Insufficient stock'
        };
      }
      
      return { success: true };
    };

    const result = await stockCheck(orderItems[0]);
    
    if (result.error) {
      console.log('❌ Stock validation failed as expected:');
      console.log(`   Requested: ${result.requestedQuantity}`);
      console.log(`   Available: ${result.availableStock}`);
      console.log(`   Product: ${result.itemName}`);
    } else {
      console.log('✅ Stock validation passed');
    }

    // Test 3: Test with valid quantity
    console.log('\n🧪 Testing order with valid quantity (5 items)');
    orderItems[0].quantity = 5;
    
    const result2 = await stockCheck(orderItems[0]);
    
    if (result2.success) {
      console.log('✅ Stock validation passed for valid quantity');
    } else {
      console.log('❌ Unexpected validation failure');
    }

    // Test 4: Test boundary case (exactly equal to stock)
    console.log('\n🧪 Testing boundary case (7 items, exactly stock)');
    orderItems[0].quantity = 7;
    
    const result3 = await stockCheck(orderItems[0]);
    
    if (result3.success) {
      console.log('✅ Stock validation passed for boundary case');
    } else {
      console.log('❌ Unexpected validation failure at boundary');
    }

    console.log('\n🎯 Stock validation tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the test
testStockValidation();
