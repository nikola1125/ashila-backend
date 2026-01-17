const mongoose = require('mongoose');
const Category = require('./models/Category'); // Adjust path as needed
require('dotenv').config();

const addSetCategory = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            console.error('❌ MONGODB_URI is not defined in .env file');
            process.exit(1);
        }

        // Ensure database name is included (copied from seedCategories.js)
        let connectionString = MONGODB_URI.trim();
        if (!connectionString.endsWith('/') && !connectionString.includes('?')) {
            if (!connectionString.match(/\/[^\/\?]+(\?|$)/)) {
                connectionString = connectionString.endsWith('/')
                    ? connectionString + 'medi-mart'
                    : connectionString + '/medi-mart';
            }
        }

        await mongoose.connect(connectionString);
        console.log('✓ Connected to MongoDB');

        const setCategory = {
            categoryName: 'Set',
            description: 'Product sets',
            groups: [
                {
                    groupName: 'Kategorite',
                    subitems: [
                        { name: 'Set per fytyren' },
                        { name: 'Set per trupin' },
                        { name: 'Set per floket' },
                        { name: 'Set per nena' },
                        { name: 'Set per femije' }
                    ]
                }
            ]
        };

        // Check if it exists
        const exists = await Category.findOne({ categoryName: 'Set' });
        if (exists) {
            console.log('Category "Set" already exists.');
        } else {
            await Category.create(setCategory);
            console.log('✓ Category "Set" added successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding category:', error);
        process.exit(1);
    }
};

addSetCategory();
