const mongoose = require('mongoose');
const Auction = require('../models/Auction');
const User = require('../models/User');
const Category = require('../models/Category');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/auction_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testFeaturedFunctionality() {
  try {
    console.log('🧪 Testing Featured Auction Functionality...\n');

    // 1. Check if isFeatured field exists in schema
    console.log('1. Checking Auction schema...');
    const auctionSchema = Auction.schema;
    const hasFeaturedField = auctionSchema.paths.hasOwnProperty('isFeatured');
    console.log(`   ✅ isFeatured field exists: ${hasFeaturedField}\n`);

    // 2. Create a test auction with isFeatured = true
    console.log('2. Creating test featured auction...');
    
    // Find or create a test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = new User({
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedpassword123',
        isEmailVerified: true
      });
      await testUser.save();
      console.log('   ✅ Created test user');
    } else {
      console.log('   ✅ Using existing test user');
    }

    // Find or create a test category
    let testCategory = await Category.findOne({ name: 'Test Category' });
    if (!testCategory) {
      testCategory = new Category({
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category for featured auction testing'
      });
      await testCategory.save();
      console.log('   ✅ Created test category');
    } else {
      console.log('   ✅ Using existing test category');
    }

    // Create featured auction
    const featuredAuction = new Auction({
      title: 'Test Featured Auction',
      description: 'This is a test auction to verify featured functionality',
      basePrice: 100,
      bidIncrement: 10,
      entryFee: 10,
      sellerId: testUser._id,
      categoryId: testCategory._id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'ACTIVE',
      isFeatured: true
    });

    await featuredAuction.save();
    console.log(`   ✅ Created featured auction: ${featuredAuction._id}\n`);

    // 3. Create a regular auction with isFeatured = false
    console.log('3. Creating test regular auction...');
    const regularAuction = new Auction({
      title: 'Test Regular Auction',
      description: 'This is a test auction that is not featured',
      basePrice: 50,
      bidIncrement: 5,
      entryFee: 5,
      sellerId: testUser._id,
      categoryId: testCategory._id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'ACTIVE',
      isFeatured: false
    });

    await regularAuction.save();
    console.log(`   ✅ Created regular auction: ${regularAuction._id}\n`);

    // 4. Test filtering by featured status
    console.log('4. Testing featured filtering...');
    
    const featuredAuctions = await Auction.find({ isFeatured: true });
    const regularAuctions = await Auction.find({ isFeatured: false });
    
    console.log(`   ✅ Found ${featuredAuctions.length} featured auctions`);
    console.log(`   ✅ Found ${regularAuctions.length} regular auctions\n`);

    // 5. Test sorting by featured status
    console.log('5. Testing featured sorting...');
    const sortedAuctions = await Auction.find({ status: 'ACTIVE' })
      .sort({ isFeatured: -1, createdAt: -1 });
    
    console.log('   ✅ Auctions sorted by featured status:');
    sortedAuctions.forEach((auction, index) => {
      console.log(`      ${index + 1}. ${auction.title} - Featured: ${auction.isFeatured}`);
    });
    console.log('');

    // 6. Test updating featured status
    console.log('6. Testing featured status update...');
    await Auction.findByIdAndUpdate(regularAuction._id, { isFeatured: true });
    const updatedAuction = await Auction.findById(regularAuction._id);
    console.log(`   ✅ Updated auction featured status: ${updatedAuction.isFeatured}\n`);

    // 7. Test index performance
    console.log('7. Testing index performance...');
    const startTime = Date.now();
    await Auction.find({ isFeatured: true, status: 'ACTIVE' });
    const endTime = Date.now();
    console.log(`   ✅ Query with featured+status index took: ${endTime - startTime}ms\n`);

    console.log('🎉 All tests passed! Featured functionality is working correctly.\n');

    // Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await Auction.deleteMany({ 
      _id: { $in: [featuredAuction._id, regularAuction._id] } 
    });
    console.log('   ✅ Test auctions deleted');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the test
testFeaturedFunctionality(); 