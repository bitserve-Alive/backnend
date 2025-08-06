const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.DATABASE_URL);

const categories = [
  {
    name: 'Electronics',
    description: 'Electronics and gadgets',
    slug: 'electronics',
    icon: 'fas fa-laptop',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Vehicles',
    description: 'Cars, bikes, and other vehicles',
    slug: 'vehicles',
    icon: 'fas fa-car',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Fashion',
    description: 'Clothing, accessories, and fashion items',
    slug: 'fashion',
    icon: 'fas fa-tshirt',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Home & Garden',
    description: 'Home appliances and garden items',
    slug: 'home-garden',
    icon: 'fas fa-home',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Sports',
    description: 'Sports equipment and fitness items',
    slug: 'sports',
    icon: 'fas fa-football-ball',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Art & Collectibles',
    description: 'Artwork, antiques, and collectible items',
    slug: 'art-collectibles',
    icon: 'fas fa-palette',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Books & Media',
    description: 'Books, movies, music, and other media',
    slug: 'books-media',
    icon: 'fas fa-book',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Jewelry',
    description: 'Jewelry and precious items',
    slug: 'jewelry',
    icon: 'fas fa-gem',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function setupCategories() {
  try {
    console.log('🚀 Setting up categories directly in MongoDB...');
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const categoriesCollection = db.collection('Category');
    
    // Check if categories already exist
    const existingCount = await categoriesCollection.countDocuments();
    console.log(`📊 Found ${existingCount} existing categories`);
    
    if (existingCount === 0) {
      // Insert categories
      const result = await categoriesCollection.insertMany(categories);
      console.log(`✅ Created ${result.insertedCount} categories`);
      
      // List created categories
      categories.forEach(cat => {
        console.log(`  📂 ${cat.name} (${cat.slug})`);
      });
    } else {
      console.log('⚠️ Categories already exist, skipping creation');
      
      // Show existing categories
      const existing = await categoriesCollection.find({}).toArray();
      existing.forEach(cat => {
        console.log(`  📂 ${cat.name} (${cat.slug})`);
      });
    }
    
    console.log('\n🎉 Category setup completed!');
    console.log('\n📋 Next steps:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Create test data: npm run create-test-data');
    console.log('  3. Visit: http://localhost:5500/products.html');
    
  } catch (error) {
    console.error('❌ Error setting up categories:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

setupCategories(); 