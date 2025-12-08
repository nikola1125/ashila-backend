const mongoose = require('mongoose');
const Category = require('../models/Category');
require('dotenv').config();

const updateCategory = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find and update "komplemente dhe vitamina" to "Nena dhe femija"
    console.log('Searching for "komplemente dhe vitamina"...');
    const category = await Category.findOne({ categoryName: 'komplemente dhe vitamina' });
    
    if (category) {
      console.log('✓ Found category:', category.categoryName);
      category.categoryName = 'Nena dhe femija';
      category.description = 'Mother and child products';
      category.groups = [
        {
          groupName: 'Foshnja(0-12 muajsh)',
          subitems: []
        },
        {
          groupName: 'Femija (1-6 vjec)',
          subitems: []
        }
      ];
      category.updatedAt = Date.now();
      
      await category.save();
      console.log('✓ Category "komplemente dhe vitamina" updated to "Nena dhe femija"');
      console.log('✓ Groups added: Foshnja(0-12 muajsh), Femija (1-6 vjec)');
    } else {
      console.log('✗ Category "komplemente dhe vitamina" not found');
      // If "komplemente dhe vitamina" doesn't exist, check if "Nena dhe femija" exists
      console.log('Checking if "Nena dhe femija" exists...');
      const existingCategory = await Category.findOne({ categoryName: 'Nena dhe femija' });
      
      if (!existingCategory) {
        console.log('Creating new category "Nena dhe femija"...');
        // Create "Nena dhe femija" if it doesn't exist
        const newCategory = new Category({
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
        });
        
        await newCategory.save();
        console.log('✓ Category "Nena dhe femija" created');
        console.log('✓ Groups added: Foshnja(0-12 muajsh), Femija (1-6 vjec)');
      } else {
        console.log('✓ Found existing category "Nena dhe femija"');
        // Update existing "Nena dhe femija" to ensure correct structure
        existingCategory.groups = [
          {
            groupName: 'Foshnja(0-12 muajsh)',
            subitems: []
          },
          {
            groupName: 'Femija (1-6 vjec)',
            subitems: []
          }
        ];
        existingCategory.updatedAt = Date.now();
        await existingCategory.save();
        console.log('✓ Category "Nena dhe femija" updated with correct structure');
        console.log('✓ Groups added: Foshnja(0-12 muajsh), Femija (1-6 vjec)');
      }
    }
    
    console.log('\n✓ Update completed successfully!');
    console.log('Please refresh your browser to see the changes in the navigation bar.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error updating category:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

updateCategory();


