require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

const CATEGORIES_TO_SEED = [
    { categoryName: "Kujdesi per fytyren" },
    { categoryName: "Kujdesi per trupin dhe floke" },
    { categoryName: "Higjene" },
    { categoryName: "Nena dhe femije" },
    { categoryName: "Suplemente dhe vitamina" },
    { categoryName: "Monitoruesit e shendetit" }
];

const seedCategories = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        let connectionString = MONGODB_URI.trim();
        // Mimic connection logic from server.js
        if (!connectionString.endsWith('/') && !connectionString.includes('?')) {
            if (!connectionString.match(/\/[^\/\?]+(\?|$)/)) {
                connectionString = connectionString.endsWith('/') ? connectionString + 'medi-mart' : connectionString + '/medi-mart';
            }
        }

        await mongoose.connect(connectionString);
        console.log('Connected to MongoDB');

        for (const cat of CATEGORIES_TO_SEED) {
            const exists = await Category.findOne({ categoryName: cat.categoryName });
            if (!exists) {
                await Category.create(cat);
                console.log(`Created category: ${cat.categoryName}`);
            } else {
                console.log(`Category exists: ${cat.categoryName}`);
            }
        }
        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedCategories();
