const axios = require('axios');

const baseURL = 'http://localhost:5000/api';

// Test users to create
const testUsers = [
  {
    firstName: 'Ahmed',
    lastName: 'Hassan',
    username: 'seller1',
    email: 'seller1@example.com',
    phone: '0321-1234567',
    password: 'password123',
    confirmPassword: 'password123'
  },
  {
    firstName: 'Sara',
    lastName: 'Khan',
    username: 'seller2',
    email: 'seller2@example.com',
    phone: '0322-2345678',
    password: 'password123',
    confirmPassword: 'password123'
  },
  {
    firstName: 'Fatima',
    lastName: 'Sheikh',
    username: 'bidder1',
    email: 'bidder1@example.com',
    phone: '0324-4567890',
    password: 'password123',
    confirmPassword: 'password123'
  },
  {
    firstName: 'Hassan',
    lastName: 'Ali',
    username: 'bidder2',
    email: 'bidder2@example.com',
    phone: '0325-5678901',
    password: 'password123',
    confirmPassword: 'password123'
  }
];

// Test auctions to create
const testAuctions = [
  {
    title: 'iPhone 15 Pro Max - 256GB',
    description: 'Brand new iPhone 15 Pro Max in Natural Titanium color. Factory unlocked, complete with original box, charger, and all accessories.',
    brand: 'Apple',
    condition: 'Brand New',
    basePrice: 85000,
    bidIncrement: 1000,
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: 'Samsung Galaxy Watch 6 Classic',
    description: 'Latest Samsung Galaxy Watch 6 Classic in excellent condition. Includes original charger and extra bands.',
    brand: 'Samsung',
    condition: 'Like New',
    basePrice: 45000,
    bidIncrement: 500,
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: 'MacBook Air M2 - 13 inch',
    description: 'Apple MacBook Air with M2 chip, 8GB RAM, 256GB SSD in Midnight color. Lightly used for 6 months.',
    brand: 'Apple',
    condition: 'Excellent',
    basePrice: 120000,
    bidIncrement: 2000,
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: 'Honda Civic 2020 - Automatic',
    description: 'Honda Civic 2020 model, automatic transmission, 45,000 km driven. Regular maintenance, excellent condition.',
    brand: 'Honda',
    condition: 'Good',
    basePrice: 3500000,
    bidIncrement: 50000,
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  }
];

async function createTestData() {
  try {
    console.log('🚀 Creating test data via API...');

    // Get categories first
    console.log('📂 Fetching categories...');
    const categoriesResponse = await axios.get(`${baseURL}/categories`);
    const categories = categoriesResponse.data.data.categories;
    console.log(`✅ Found ${categories.length} categories`);

    // Create test users
    console.log('\n👥 Creating test users...');
    const createdUsers = [];
    
    for (const user of testUsers) {
      try {
        const response = await axios.post(`${baseURL}/auth/register`, user);
        createdUsers.push({
          user: response.data.data.user,
          tokens: response.data.data.tokens
        });
        console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
          console.log(`⚠️ User already exists: ${user.email}`);
          
          // Try to login instead
          try {
            const loginResponse = await axios.post(`${baseURL}/auth/login`, {
              email: user.email,
              password: user.password
            });
            createdUsers.push({
              user: loginResponse.data.data.user,
              tokens: loginResponse.data.data.tokens
            });
            console.log(`✅ Logged in existing user: ${user.email}`);
          } catch (loginError) {
            console.error(`❌ Failed to login user ${user.email}:`, loginError.response?.data?.message || loginError.message);
          }
        } else {
          console.error(`❌ Failed to create user ${user.email}:`, error.response?.data?.message || error.message);
        }
      }
    }

    // Create test auctions
    console.log('\n🏷️ Creating test auctions...');
    if (createdUsers.length > 0 && categories.length > 0) {
      const electronicsCategory = categories.find(c => c.slug === 'electronics') || categories[0];
      const vehiclesCategory = categories.find(c => c.slug === 'vehicles') || categories[0];
      
      for (let i = 0; i < testAuctions.length; i++) {
        const auction = testAuctions[i];
        const seller = createdUsers[i % createdUsers.length];
        
        if (!seller) {
          console.log(`⚠️ No seller available for auction: ${auction.title}`);
          continue;
        }

        try {
          // Choose category based on auction type
          const categoryId = auction.title.includes('Honda') ? vehiclesCategory.id : electronicsCategory.id;
          
          const auctionData = {
            ...auction,
            categoryId
          };

          const response = await axios.post(`${baseURL}/auctions`, auctionData, {
            headers: {
              'Authorization': `Bearer ${seller.tokens.accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          console.log(`✅ Created auction: ${auction.title}`);
        } catch (error) {
          console.error(`❌ Failed to create auction ${auction.title}:`, error.response?.data?.message || error.message);
        }
      }
    }

    console.log('\n🎉 Test data creation completed!');
    console.log('\n🔐 Test User Credentials:');
    testUsers.forEach(user => {
      console.log(`   📧 ${user.email} / ${user.password}`);
    });

    console.log('\n📊 You can now:');
    console.log('   🌐 Visit the frontend to see auctions');
    console.log('   🔑 Login with any test user credentials');
    console.log('   🏷️ View products at: http://localhost:5000/products.html');
    console.log('   💰 Place bids on auctions');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   npm run dev');
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${baseURL}/`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running!');
    console.log('💡 Please start the server first:');
    console.log('   npm run dev');
    console.log('\n Then run this script again:');
    console.log('   npm run create-test-data');
    return;
  }

  console.log('✅ Server is running!');
  await createTestData();
}

main(); 