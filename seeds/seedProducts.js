const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
require('dotenv').config();

const seedProducts = async () => {
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

    // Get categories
    const categories = await Category.find();
    if (categories.length === 0) {
      console.log('⚠️  No categories found. Please run seedCategories.js first!');
      process.exit(1);
    }

    // Get or create a default seller user
    let seller = await User.findOne({ role: 'seller' });
    if (!seller) {
      console.log('⚠️  No seller user found. Creating a default seller...');
      seller = new User({
        name: 'Default Seller',
        email: 'seller@medimart.com',
        role: 'seller',
        photoURL: 'https://via.placeholder.com/150'
      });
      await seller.save();
      console.log('✓ Default seller created');
    }

    // Clear existing products before seeding new ones
    await Product.deleteMany({});
    console.log('✓ Cleared existing products');

    // Available images from src/images
    const availableImages = [
      '/images/25-12-248-5_f6d1d39c-0dbb-41df-b09b-606b8643c4d4.webp',
      '/images/2d6c295f-0d8b-4ed7-9048-15c38970f06c.webp',
      '/images/4_191a7880-0b71-4057-9ab7-35e79aafa669.webp',
      '/images/5_0bf7b0e1-73b6-44dd-94f4-dc404b267c7a.webp',
      '/images/baume.webp',
      '/images/BeautyofJoseon-ReliefSuntexture.webp',
      '/images/centella.webp',
      '/images/ceravefoaming2.webp',
      '/images/hairtowel.webp',
      '/images/IMG_2112_301a03db-e67d-4e84-9cd9-9c97c40824d2.webp',
      '/images/MisshaALLAROUNDSUNSPF50.webp',
      '/images/puff_254f1eef-7b9c-446a-be78-d82c14da0c4b.webp',
      '/images/skin55ml_c9356fb5-f92f-4b33-b31b-0c44cf88c58e.webp',
      '/images/TheOrdinaryGlycolicAcid7_ToningSolutiontexture.webp'
    ];

    // Random product name generators
    const productTypes = [
      'Serum', 'Cream', 'Cleanser', 'Toner', 'Moisturizer', 'Sunscreen', 
      'Mask', 'Treatment', 'Essence', 'Lotion', 'Gel', 'Oil', 'Scrub', 
      'Exfoliant', 'Shampoo', 'Conditioner', 'Body Wash', 'Body Lotion'
    ];
    
    const adjectives = [
      'Radiant', 'Glowing', 'Revitalizing', 'Nourishing', 'Hydrating', 
      'Repairing', 'Brightening', 'Smoothing', 'Refining', 'Protecting',
      'Calming', 'Soothing', 'Purifying', 'Rejuvenating', 'Energizing',
      'Restoring', 'Strengthening', 'Balancing', 'Clarifying', 'Firming'
    ];
    
    const brands = [
      'DermaCare', 'SkinLux', 'BeautyEssence', 'GlowPro', 'PureSkin',
      'Naturale', 'EliteCare', 'VitalBeauty', 'Radiance', 'Serenity',
      'Aura', 'Luminous', 'Elegance', 'Prestige', 'Harmony'
    ];

    // Random description templates
    const descriptionTemplates = [
      'Formulated with advanced ingredients to provide exceptional results. This product delivers visible improvements in skin texture and appearance.',
      'A carefully crafted formula designed to address specific skincare needs. Experience the difference with this premium quality product.',
      'Enriched with natural extracts and scientifically proven compounds. This product offers professional-grade results for your daily routine.',
      'Created with precision and care, this product combines effective ingredients to deliver optimal performance and visible benefits.',
      'A luxurious formulation that pampers your skin while providing essential care. Discover the transformative power of quality skincare.',
      'Expertly developed to meet the highest standards of skincare excellence. This product represents the perfect balance of science and nature.',
      'Infused with premium ingredients sourced from around the world. Experience the ultimate in skincare innovation and effectiveness.',
      'A sophisticated blend of active compounds designed to enhance your natural beauty. This product offers professional results you can trust.'
    ];

    // Generate random products
    const generateRandomProduct = (image, index) => {
      const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const description = descriptionTemplates[Math.floor(Math.random() * descriptionTemplates.length)];
      
      const itemName = `${adjective} ${productType}`;
      const genericName = productType;
      const price = Math.floor(Math.random() * 4000) + 1500; // 1500-5500
      const discount = Math.random() > 0.4 ? Math.floor(Math.random() * 30) : 0; // 40% chance of no discount
      const stock = Math.floor(Math.random() * 60) + 20; // 20-80
      
      // Assign categories based on product type
      let categoryName = 'Kujdesi ndaj fytyres';
      if (productType.includes('Shampoo') || productType.includes('Conditioner') || productType.includes('Hair')) {
        categoryName = 'Trupi dhe floke';
      } else if (productType.includes('Body')) {
        categoryName = 'Trupi dhe floke';
      }
      
      // Make first 8 products bestsellers (especially skincare products)
      const isBestseller = index < 8 && categoryName === 'Kujdesi ndaj fytyres';
      const bestsellerCategory = isBestseller ? 'skincare' : null;
      
      return {
        itemName,
        genericName,
        company: brand,
        categoryName,
        price,
        discount,
        image,
        description,
        stock,
        sellerEmail: seller.email,
        dosage: 'Use as directed',
        manufacturer: brand,
        isBestseller,
        bestsellerCategory,
        isActive: true
      };
    };

    // Create products from available images
    const products = availableImages.map((image, index) => 
      generateRandomProduct(image, index)
    );

    // Map products to categories
    const productsWithCategories = await Promise.all(
      products.map(async (productData) => {
        const category = categories.find(
          (cat) => cat.categoryName === productData.categoryName
        );
        
        if (!category) {
          console.warn(`⚠️  Category "${productData.categoryName}" not found for product "${productData.itemName}"`);
          return null;
        }

        // Create product with category reference
        const product = new Product({
          ...productData,
          category: category._id,
          seller: seller._id
        });

        return product;
      })
    );

    // Filter out null products (categories not found)
    const validProducts = productsWithCategories.filter((p) => p !== null);

    if (validProducts.length === 0) {
      console.log('⚠️  No valid products to seed. Please check category names match!');
      process.exit(1);
    }

    // Save products one by one to handle validation
    const savedProducts = [];
    for (const product of validProducts) {
      try {
        const saved = await product.save();
        savedProducts.push(saved);
      } catch (error) {
        console.warn(`⚠️  Failed to save product "${product.itemName}":`, error.message);
      }
    }
    console.log(`✓ Products seeded successfully: ${savedProducts.length}`);
    console.log(`  - Bestsellers: ${savedProducts.filter(p => p.isBestseller).length}`);
    console.log(`  - Regular products: ${savedProducts.filter(p => !p.isBestseller).length}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedProducts();

