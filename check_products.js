const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Product = require('./models/Product');

async function checkProducts() {
    try {
        await mongoose.connect(process.env.DB_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
        console.log('Recent 5 products productType fields:');
        products.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.itemName}, Type: ${p.productType}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkProducts();
