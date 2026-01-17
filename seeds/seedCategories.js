const mongoose = require('mongoose');
const Category = require('../models/Category');
require('dotenv').config();

const seedCategories = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env file');
      process.exit(1);
    }

    // Ensure database name is included
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

    // Clear existing categories
    await Category.deleteMany({});

    const categories = [
      {
        categoryName: 'Kujdesi ndaj fytyres',
        description: 'Face care products',
        groups: [
          {
            groupName: 'Te gjitha',
            subitems: []
          },
          {
            groupName: 'Tipi i lekures',
            subitems: [
              { name: 'Te gjitha tippet e lekures' },
              { name: 'Lekure miksese/yndyrshme' },
              { name: 'Lekure normale' },
              { name: 'Lekure e thate' },
              { name: 'Lekure sensitive' }
            ]
          },
          {
            groupName: 'Problematikat e lekures',
            subitems: [
              { name: 'Akne' },
              { name: 'Rrudha' },
              { name: 'Hiperpigmentim' },
              { name: 'Balancim yndyre' },
              { name: 'Pikat e zeza' },
              { name: 'Dehidratim' },
              { name: 'Skuqje' },
              { name: 'Rosacea' }
            ]
          }
        ]
      },
      {
        categoryName: 'Trupi dhe floke',
        description: 'Body and hair care products',
        groups: [
          {
            groupName: 'Produkte per trupin',
            subitems: [
              { name: 'Scrub trupi' },
              { name: 'Lares trupi' },
              { name: 'Hidratues trupi' },
              { name: 'Akne trupi' },
              { name: 'SPF trupi' }
            ]
          },
          {
            groupName: 'Produkte per floke',
            subitems: [
              { name: 'Floke te yndyrshem' },
              { name: 'Floke me zbokth' },
              { name: 'Renia e flokut' },
              { name: 'Skalp sensitiv' }
            ]
          },
          {
            groupName: 'Te gjitha produktet',
            subitems: []
          }
        ]
      },
      {
        categoryName: 'Nena dhe femija',
        description: 'Mother and child products',
        groups: [
          {
            groupName: 'Foshnja(0-12 muajsh)',
            subitems: []
          },
          {
            groupName: 'Femija (1-6 vjec)',
            subitems: []
          }
        ]
      },
      {
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
      }
    ];

    const savedCategories = await Category.insertMany(categories);
    console.log('✓ Categories seeded successfully:', savedCategories.length);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
