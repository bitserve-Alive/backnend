const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Dummy data
const categories = [
  {
    name: 'Electronics',
    description: 'Electronics and gadgets',
    slug: 'electronics',
    icon: 'fas fa-laptop'
  },
  {
    name: 'Vehicles',
    description: 'Cars, bikes, and other vehicles',
    slug: 'vehicles',
    icon: 'fas fa-car'
  },
  {
    name: 'Fashion',
    description: 'Clothing, accessories, and fashion items',
    slug: 'fashion',
    icon: 'fas fa-tshirt'
  },
  {
    name: 'Home & Garden',
    description: 'Home appliances and garden items',
    slug: 'home-garden',
    icon: 'fas fa-home'
  },
  {
    name: 'Sports',
    description: 'Sports equipment and fitness items',
    slug: 'sports',
    icon: 'fas fa-football-ball'
  },
  {
    name: 'Art & Collectibles',
    description: 'Artwork, antiques, and collectible items',
    slug: 'art-collectibles',
    icon: 'fas fa-palette'
  },
  {
    name: 'Books & Media',
    description: 'Books, movies, music, and other media',
    slug: 'books-media',
    icon: 'fas fa-book'
  },
  {
    name: 'Jewelry',
    description: 'Jewelry and precious items',
    slug: 'jewelry',
    icon: 'fas fa-gem'
  }
];

const users = [
  {
    email: 'seller1@example.com',
    username: 'seller1',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    phone: '0321-1234567',
    password: 'password123',
    isEmailVerified: true,
    role: 'USER'
  },
  {
    email: 'seller2@example.com',
    username: 'seller2',
    firstName: 'Sara',
    lastName: 'Khan',
    phone: '0322-2345678',
    password: 'password123',
    isEmailVerified: true,
    role: 'USER'
  },
  {
    email: 'seller3@example.com',
    username: 'seller3',
    firstName: 'Ali',
    lastName: 'Ahmed',
    phone: '0323-3456789',
    password: 'password123',
    isEmailVerified: true,
    role: 'USER'
  },
  {
    email: 'bidder1@example.com',
    username: 'bidder1',
    firstName: 'Fatima',
    lastName: 'Sheikh',
    phone: '0324-4567890',
    password: 'password123',
    isEmailVerified: true,
    role: 'USER'
  },
  {
    email: 'bidder2@example.com',
    username: 'bidder2',
    firstName: 'Hassan',
    lastName: 'Ali',
    phone: '0325-5678901',
    password: 'password123',
    isEmailVerified: true,
    role: 'USER'
  },
  {
    email: 'admin@pakauction.com',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    phone: '0320-0000000',
    password: 'admin123',
    isEmailVerified: true,
    role: 'ADMIN'
  }
];

const auctions = [
  {
    title: 'iPhone 15 Pro Max - 256GB',
    description: 'Brand new iPhone 15 Pro Max in Natural Titanium color. Factory unlocked, complete with original box, charger, and all accessories. Perfect condition.',
    brand: 'Apple',
    condition: 'Brand New',
    basePrice: 85000,
    bidIncrement: 1000,
    entryFee: 8500,
    categorySlug: 'electronics',
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Samsung Galaxy Watch 6 Classic',
    description: 'Latest Samsung Galaxy Watch 6 Classic in excellent condition. Includes original charger, extra bands, and screen protector already applied.',
    brand: 'Samsung',
    condition: 'Like New',
    basePrice: 45000,
    bidIncrement: 500,
    entryFee: 4500,
    categorySlug: 'electronics',
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    status: 'ACTIVE'
  },
  {
    title: 'MacBook Air M2 - 13 inch',
    description: 'Apple MacBook Air with M2 chip, 8GB RAM, 256GB SSD in Midnight color. Lightly used for 6 months, excellent condition with original packaging.',
    brand: 'Apple',
    condition: 'Excellent',
    basePrice: 120000,
    bidIncrement: 2000,
    entryFee: 12000,
    categorySlug: 'electronics',
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Honda Civic 2020 - Automatic',
    description: 'Honda Civic 2020 model, automatic transmission, 45,000 km driven. Regular maintenance, excellent condition, single owner. All documents clear.',
    brand: 'Honda',
    condition: 'Good',
    basePrice: 3500000,
    bidIncrement: 50000,
    entryFee: 350000,
    categorySlug: 'vehicles',
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Yamaha YZF-R6 2019',
    description: 'Yamaha YZF-R6 2019 model sports bike. Low mileage, well maintained, garage kept. Perfect for bike enthusiasts.',
    brand: 'Yamaha',
    condition: 'Excellent',
    basePrice: 1200000,
    bidIncrement: 25000,
    entryFee: 120000,
    categorySlug: 'vehicles',
    endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Designer Lawn Suit - Unstitched',
    description: 'Premium designer lawn suit, unstitched, with embroidered dupatta and trouser. Perfect for summer season.',
    brand: 'Khaadi',
    condition: 'Brand New',
    basePrice: 8500,
    bidIncrement: 200,
    entryFee: 850,
    categorySlug: 'fashion',
    endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Antique Wooden Chest',
    description: 'Beautiful antique wooden chest from the 1940s. Hand-carved details, brass fittings. Perfect for collectors or home decoration.',
    brand: 'Vintage',
    condition: 'Good',
    basePrice: 25000,
    bidIncrement: 1000,
    entryFee: 2500,
    categorySlug: 'art-collectibles',
    endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Home Gym Equipment Set',
    description: 'Complete home gym setup including dumbbells, bench press, squat rack, and resistance bands. Lightly used, excellent condition.',
    brand: 'PowerTech',
    condition: 'Good',
    basePrice: 65000,
    bidIncrement: 2000,
    entryFee: 6500,
    categorySlug: 'sports',
    endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Diamond Ring - 1 Carat',
    description: 'Stunning 1-carat diamond ring in 18k white gold setting. Certified diamond with excellent cut and clarity. Perfect for engagement.',
    brand: 'Tiffany & Co',
    condition: 'Like New',
    basePrice: 350000,
    bidIncrement: 10000,
    entryFee: 35000,
    categorySlug: 'jewelry',
    endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    status: 'ACTIVE'
  },
  {
    title: 'Harry Potter Complete Book Set',
    description: 'Complete Harry Potter book series, hardcover first editions. Excellent condition, collector\'s item for book lovers.',
    brand: 'Bloomsbury',
    condition: 'Excellent',
    basePrice: 15000,
    bidIncrement: 500,
    entryFee: 1500,
    categorySlug: 'books-media',
    endTime: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
    status: 'ACTIVE'
  }
];

async function seed() {
  try {
    console.log('🚀 Starting database seeding...');

    // Skip clearing existing data to avoid transaction issues
    console.log('📦 Seeding data (preserving existing records)...');

    // Create categories
    console.log('📂 Creating categories...');
    const createdCategories = {};
    for (const category of categories) {
      try {
        // Check if category already exists
        const existing = await prisma.category.findUnique({
          where: { slug: category.slug }
        });

        if (!existing) {
          const created = await prisma.category.create({
            data: category
          });
          createdCategories[category.slug] = created;
          console.log(`✅ Created category: ${category.name}`);
        } else {
          createdCategories[category.slug] = existing;
          console.log(`⚠️ Category already exists: ${category.name}`);
        }
      } catch (error) {
        console.error(`❌ Error with category ${category.name}:`, error);
      }
    }

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const user of users) {
      try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({
          where: { email: user.email }
        });

        if (!existing) {
          const hashedPassword = await bcrypt.hash(user.password, 12);
          const created = await prisma.user.create({
            data: {
              ...user,
              password: hashedPassword
            }
          });
          createdUsers.push(created);
          console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
        } else {
          createdUsers.push(existing);
          console.log(`⚠️ User already exists: ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error with user ${user.email}:`, error);
      }
    }

    // Create auctions
    console.log('🏷️ Creating auctions...');
    const createdAuctions = [];
    for (let i = 0; i < auctions.length; i++) {
      try {
        const auction = auctions[i];
        const seller = createdUsers[i % 3]; // Rotate between first 3 users as sellers
        const category = createdCategories[auction.categorySlug];

        if (!seller || !category) {
          console.log(`⚠️ Skipping auction ${auction.title} - missing seller or category`);
          continue;
        }

        // Check if auction already exists
        const existing = await prisma.auction.findFirst({
          where: { 
            title: auction.title,
            sellerId: seller.id
          }
        });

        if (!existing) {
          const created = await prisma.auction.create({
            data: {
              title: auction.title,
              description: auction.description,
              brand: auction.brand,
              condition: auction.condition,
              basePrice: auction.basePrice,
              currentBid: auction.basePrice,
              bidIncrement: auction.bidIncrement,
              entryFee: auction.entryFee,
              endTime: auction.endTime,
              status: auction.status,
              sellerId: seller.id,
              categoryId: category.id,
              viewCount: Math.floor(Math.random() * 100) + 10,
              bidCount: 0
            }
          });
          createdAuctions.push(created);
          console.log(`✅ Created auction: ${auction.title}`);
        } else {
          createdAuctions.push(existing);
          console.log(`⚠️ Auction already exists: ${auction.title}`);
        }
      } catch (error) {
        console.error(`❌ Error with auction ${auctions[i].title}:`, error);
      }
    }

    // Create some sample bids (only for new auctions)
    console.log('💰 Creating sample bids...');
    const bidders = createdUsers.slice(3, 6); // Use last 3 users as bidders
    
    if (bidders.length > 0) {
      for (let i = 0; i < Math.min(5, createdAuctions.length); i++) {
        try {
          const auction = createdAuctions[i];
          
          // Check if auction already has bids
          const existingBids = await prisma.bid.findFirst({
            where: { auctionId: auction.id }
          });

          if (!existingBids) {
            // Create 2-3 bids per auction
            const numBids = Math.floor(Math.random() * 2) + 2;
            let currentBid = auction.basePrice;
            
            for (let j = 0; j < numBids; j++) {
              currentBid += auction.bidIncrement;
              const bidderForThisBid = bidders[j % bidders.length];
              
              await prisma.bid.create({
                data: {
                  amount: currentBid,
                  bidderId: bidderForThisBid.id,
                  auctionId: auction.id,
                  isWinning: j === numBids - 1 // Last bid is winning
                }
              });
            }

            // Update auction with current bid and bid count
            await prisma.auction.update({
              where: { id: auction.id },
              data: {
                currentBid: currentBid,
                bidCount: numBids
              }
            });

            console.log(`✅ Created ${numBids} bids for: ${auction.title}`);
          } else {
            console.log(`⚠️ Auction already has bids: ${auction.title}`);
          }
        } catch (error) {
          console.error(`❌ Error creating bids for auction:`, error);
        }
      }
    }

    // Create some watchlist entries
    console.log('⭐ Creating watchlist entries...');
    if (bidders.length > 0 && createdAuctions.length > 2) {
      for (let i = 0; i < Math.min(3, bidders.length); i++) {
        try {
          const user = bidders[i];
          const auction = createdAuctions[i + 2];
          
          if (!user || !auction) continue;

          // Check if watchlist entry already exists
          const existing = await prisma.watchlist.findUnique({
            where: {
              userId_auctionId: {
                userId: user.id,
                auctionId: auction.id
              }
            }
          });

          if (!existing) {
            await prisma.watchlist.create({
              data: {
                userId: user.id,
                auctionId: auction.id
              }
            });
            console.log(`✅ Added ${auction.title} to ${user.firstName}'s watchlist`);
          } else {
            console.log(`⚠️ Watchlist entry already exists for ${user.firstName}`);
          }
        } catch (error) {
          console.error(`❌ Error creating watchlist entry:`, error);
        }
      }
    }

    // Create some notifications
    console.log('🔔 Creating sample notifications...');
    if (bidders.length > 0) {
      for (let i = 0; i < bidders.length; i++) {
        try {
          const user = bidders[i];
          const auction = createdAuctions[i] || createdAuctions[0];
          
          if (!user || !auction) continue;

          // Create welcome notification
          await prisma.notification.create({
            data: {
              title: 'Welcome to PakAuction!',
              message: 'Thank you for joining our auction platform. Start bidding on amazing items!',
              type: 'GENERAL',
              userId: user.id
            }
          });

          // Create auction notification
          await prisma.notification.create({
            data: {
              title: 'New Bid Placed',
              message: `A new bid has been placed on "${auction.title}". Check it out!`,
              type: 'BID_PLACED',
              userId: user.id,
              auctionId: auction.id
            }
          });

          console.log(`✅ Created notifications for ${user.firstName}`);
        } catch (error) {
          console.error(`❌ Error creating notifications:`, error);
        }
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    
    // Get actual counts from database
    const categoryCount = await prisma.category.count();
    const userCount = await prisma.user.count();
    const auctionCount = await prisma.auction.count();
    const bidCount = await prisma.bid.count();
    const watchlistCount = await prisma.watchlist.count();
    const notificationCount = await prisma.notification.count();

    console.log('\n📊 Current Database Summary:');
    console.log(`   📂 Categories: ${categoryCount}`);
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   🏷️ Auctions: ${auctionCount}`);
    console.log(`   💰 Bids: ${bidCount}`);
    console.log(`   ⭐ Watchlist entries: ${watchlistCount}`);
    console.log(`   🔔 Notifications: ${notificationCount}`);
    
    console.log('\n🔐 Test User Credentials:');
    console.log('   📧 seller1@example.com / password123');
    console.log('   📧 bidder1@example.com / password123');
    console.log('   📧 admin@pakauction.com / admin123');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seed(); 