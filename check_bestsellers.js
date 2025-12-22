const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('No MONGODB_URI found');
    process.exit(1);
}

// Fix connection string if needed (copied from server.js logic)
let connectionString = MONGODB_URI.trim();
if (!connectionString.endsWith('/') && !connectionString.includes('?')) {
    if (!connectionString.match(/\/[^\/\?]+(\?|$)/)) {
        connectionString += '/medi-mart';
    }
}

mongoose.connect(connectionString)
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            const total = await Product.countDocuments();
            const bestsellers = await Product.countDocuments({ isBestseller: true });

            console.log(`Total Products: ${total}`);
            console.log(`Bestseller Products (isBestseller: true): ${bestsellers}`);

            if (bestsellers === 0 && total > 0) {
                console.log('No bestsellers found. Marking top 5 products as bestsellers...');
                const products = await Product.find().limit(5);
                for (const p of products) {
                    p.isBestseller = true;
                    p.bestsellerCategory = 'skincare'; // Default
                    await p.save();
                    console.log(`Marked ${p.itemName} as bestseller`);
                }
            }

        } catch (e) {
            console.error(e);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => {
        console.error('Connection error:', err);
    });
