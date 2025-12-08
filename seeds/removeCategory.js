const mongoose = require('mongoose');
const Category = require('../models/Category');
require('dotenv').config();

const removeCategory = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find and delete "komplemente dhe vitamina"
    console.log('Searching for "komplemente dhe vitamina"...');
    const category = await Category.findOne({ categoryName: 'komplemente dhe vitamina' });
    
    if (category) {
      await Category.deleteOne({ _id: category._id });
      console.log('✓ Category "komplemente dhe vitamina" deleted successfully');
    } else {
      console.log('✓ Category "komplemente dhe vitamina" not found in database (already removed)');
    }
    
    console.log('\n✓ Cleanup completed successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error removing category:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

removeCategory();

