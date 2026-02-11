
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');
require('dotenv').config();

const ORDER_ID = '698ba1fd6f5d9b576eca01bd';

const debugOrder = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) throw new Error('MONGODB_URI is undefined in .env');
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const order = await Order.findById(ORDER_ID);
        if (!order) {
            console.log('Order not found!');
            return;
        }

        console.log('Order found:', {
            id: order._id,
            status: order.status,
            itemsCount: order.items.length
        });

        for (const item of order.items) {
            console.log('\n--- Item ---');
            console.log('Name:', item.itemName);
            console.log('ProductId:', item.productId);
            console.log('SelectedSize:', item.selectedSize);
            console.log('Quantity:', item.quantity);

            if (item.productId) {
                const product = await Product.findById(item.productId);
                if (product) {
                    console.log('Product Found:');
                    console.log('  Root Size:', product.size);
                    console.log('  Root Stock:', product.stock);
                    console.log('  Variants Array Length:', product.variants?.length || 0);
                    if (product.variants?.length > 0) {
                        console.log('  Variants:', JSON.stringify(product.variants, null, 2));
                    }

                    // Simulate the failing query
                    const qty = item.quantity;
                    const query = item.selectedSize
                        ? { _id: item.productId, size: item.selectedSize, stock: { $gte: qty } }
                        : { _id: item.productId, stock: { $gte: qty } };

                    console.log('  Simulated Query:', JSON.stringify(query));
                    const match = await Product.findOne(query);
                    console.log('  Query Match Result:', match ? 'FOUND' : 'NOT FOUND (This explains the 400 error)');

                    // Check if it matches a nested variant
                    if (!match && item.selectedSize && product.variants?.length > 0) {
                        const variantMatch = product.variants.find(v => v.size === item.selectedSize);
                        if (variantMatch) {
                            console.log('  BUT! Found matching variant in nested array:', variantMatch);
                            console.log('  Variant Stock:', variantMatch.stock);
                            if (variantMatch.stock >= qty) {
                                console.log('  CONCLUSION: Code needs to handle nested variants.');
                            } else {
                                console.log('  CONCLUSION: Variant found but insufficient stock.');
                            }
                        }
                    }

                } else {
                    console.log('Product NOT in DB (This explains the 400 error)');
                }
            } else {
                console.log('No ProductId on item (Legacy?)');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

debugOrder();
