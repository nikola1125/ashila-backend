const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Detailed Database Inspection ---');

        const categories = [
            'Kujdesi per fytyren',
            'Kujdesi per trupin dhe floke',
            'Higjene',
            'Nena dhe femije',
            'Suplemente dhe vitamina',
            'Monitoruesit e shendetit'
        ];

        for (const cat of categories) {
            console.log(`\nCategory: ${cat}`);
            const products = await Product.find({ categoryName: { $regex: new RegExp(cat, 'i') } }).limit(3);
            if (products.length === 0) {
                console.log('  No products found');
                continue;
            }
            products.forEach(p => {
                console.log(`  - ${p.itemName} | Sub: ${p.subcategory} | Opt: ${p.option} | Opts: ${p.options}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
