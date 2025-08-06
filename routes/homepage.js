const express = require('express');
const Homepage = require('../models/Homepage');
const Auction = require('../models/Auction');
const AuctionImage = require('../models/AuctionImage');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET homepage content (public)
router.get('/content', async (req, res) => {
  try {
    let homepage = await Homepage.findOne();
    
    if (!homepage) {
      // Create default content
      homepage = await Homepage.create({
        hero: {
          title: "Discover Unique Items at Unbeatable Prices",
          subtitle: "Join thousands of bidders in the most exciting online auction platform. Find treasures and bid with confidence.",
          primaryButtonText: "Browse Auctions",
          secondaryButtonText: "Start Bidding",
          statsText: "Joined by 10,000+ bidders this month",
          backgroundImage: "https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg",
          featuredAuctionId: null
        },
        exploreStore: {
          title: "Explore Our Store",
          subtitle: "Curated collections across categories — antiques, art, luxury, and more.",
          categories: [
            {
              title: "Antiques",
              description: "Rare, authentic pieces with timeless appeal and historical value.",
              itemCount: "150+ items",
              image: "https://images.unsplash.com/photo-1551913902-c92207136625?auto=format&fit=crop&w=800&q=80",
              link: "products.html?category=antiques"
            },
            {
              title: "Art & Collectibles",
              description: "Discover art from emerging creators and timeless collectible pieces.",
              itemCount: "200+ items",
              image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80",
              link: "products.html?category=art"
            },
            {
              title: "Luxury Items",
              description: "Premium watches, designer jewelry, and high-end collectibles.",
              itemCount: "100+ items",
              image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
              link: "products.html?category=luxury"
            }
          ]
        },
        sellToUs: {
          title: "Sell Your Valuable Items To Us",
          subtitle: "Have valuable items you want to sell? Our platform offers a seamless selling experience with expert appraisals, competitive pricing, and a global audience of eager buyers.",
          features: [
            {
              icon: "fas fa-check-circle",
              title: "Expert Appraisals",
              description: "Our team of experts will provide a fair and accurate valuation of your items."
            },
            {
              icon: "fas fa-dollar-sign",
              title: "Competitive Pricing",
              description: "Get the best possible price for your items through our competitive bidding system."
            },
            {
              icon: "fas fa-globe",
              title: "Global Reach",
              description: "Access to our worldwide network of collectors and enthusiasts."
            }
          ],
          primaryButtonText: "Start Selling",
          secondaryButtonText: "Learn More"
        },
        howItWorks: {
          title: "How It Works",
          subtitle: "Our auction platform is designed to be simple and transparent. Follow these steps to start bidding on your favorite items.",
          steps: [
            {
              stepNumber: 1,
              title: "Create an Account",
              description: "Sign up for free and browse through our extensive collection of unique items up for auction.",
              icon: "fas fa-user",
              features: [
                "Quick registration process",
                "Secure account verification",
                "Access to all auction categories"
              ]
            },
            {
              stepNumber: 2,
              title: "Pay Entry Fee",
              description: "Pay 10% of the base price to unlock bidding capabilities on your desired auction items.",
              icon: "fas fa-credit-card",
              features: [
                "Multiple payment methods",
                "Secure transaction processing",
                "Fee applied to final purchase"
              ]
            },
            {
              stepNumber: 3,
              title: "Start Bidding",
              description: "Place your bids and compete with other bidders to win the items you desire at great prices.",
              icon: "fas fa-gavel",
              features: [
                "Real-time bid updates",
                "Bid history tracking",
                "Outbid notifications"
              ]
            }
          ]
        },
        testimonials: {
          title: "What Our Users Say",
          subtitle: "Don't just take our word for it. Here's what our community of bidders and sellers have to say about their experience.",
          items: [
            {
              name: "Michael Johnson",
              position: "Vintage Collector",
              rating: 5,
              content: "I've been using PakistanAuction for over a year now and have found some incredible deals on vintage electronics. The bidding process is exciting and fair. Highly recommended!",
              avatar: "https://imgs.search.brave.com/VYKUwLXCe55uWEuXzt6rV1xUHNrNAGqxvp5QJb83iDg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTM2/MzY5OTEyNS9waG90/by95b3VuZy1lbnRy/ZXByZW5ldXItaW4t/aGlzLW9mZmljZS5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/Z3dWUXN1dFRwU1M0/ekk2T1JldmNGSzFk/NmI2LUZJTWhocUVw/b0pjclpzST0"
            },
            {
              name: "Sarah Williams",
              position: "Art Enthusiast",
              rating: 5,
              content: "As an art collector, I've found PakistanAuction to be the perfect platform for discovering unique pieces. The 10% entry fee system ensures only serious bidders participate, which I appreciate.",
              avatar: "https://imgs.search.brave.com/Fy79XeAn4NPiR0po5fVptjwYM3SoPpufxXbHQDXtyS0/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTA1/Nzk3MTQ1Mi9waG90/by9vZmZpY2Utd29y/a2VyLXBvcnRyYWl0/LmpwZz9zPTYxMng2/MTImdz0wJms9MjAm/Yz1CSGk0bEJ3a0lm/dWJXTG9RMDdOdmF3/ZWhFbjBIY1VrMHRq/YU1aWE9UeGtZPQ"
            },
            {
              name: "David Chen",
              position: "Gaming Enthusiast",
              rating: 4,
              content: "I was skeptical at first about the entry fee, but it actually makes the whole experience better. Less competition from non-serious bidders and I've won several rare retro games at great prices!",
              avatar: "https://imgs.search.brave.com/n0aNpNTLjBbdRDDngXEAD8rsh9uu24DENM_G4BiJgfY/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTMx/OTc3MTY1MS9waG90/by9wb3J0cmFpdC1v/Zi1tYW4tc21pbGlu/Zy1hdC1jYW1lcmEu/anBnP3M9NjEyeDYx/MiZ3PTAmaz0yMCZj/PWtZN1VtbDZLVUgx/eG9JcFhNaWtUcGQz/SjctdlJzRHpOOUIt/VjZWY3M4YlU9"
            }
          ]
        },
        newsletter: {
          title: "Stay Updated on New Auctions",
          subtitle: "Subscribe to our newsletter to receive updates on new auctions, exclusive offers, and tips for finding the best deals on our platform.",
          buttonText: "Subscribe",
          privacyText: "We respect your privacy. Unsubscribe at any time."
        }
      });
    }

    res.json({
      success: true,
      data: homepage
    });
  } catch (error) {
    console.error('Get homepage content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage content'
    });
  }
});

// UPDATE homepage content (admin only)
router.put('/content', verifyToken, requireAdmin, async (req, res) => {
  try {
    let homepage = await Homepage.findOne();
    
    if (!homepage) {
      homepage = new Homepage();
    }

    // Update fields if provided
    if (req.body.hero) homepage.hero = { ...homepage.hero, ...req.body.hero };
    if (req.body.exploreStore) homepage.exploreStore = { ...homepage.exploreStore, ...req.body.exploreStore };
    if (req.body.sellToUs) homepage.sellToUs = { ...homepage.sellToUs, ...req.body.sellToUs };
    if (req.body.howItWorks) homepage.howItWorks = { ...homepage.howItWorks, ...req.body.howItWorks };
    if (req.body.testimonials) homepage.testimonials = { ...homepage.testimonials, ...req.body.testimonials };
    if (req.body.newsletter) homepage.newsletter = { ...homepage.newsletter, ...req.body.newsletter };

    await homepage.save();

    res.json({
      success: true,
      message: 'Homepage content updated successfully',
      data: homepage
    });
  } catch (error) {
    console.error('Update homepage content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update homepage content'
    });
  }
});

// GET featured auction for hero section (public)
router.get('/featured-auction', async (req, res) => {
  try {
    const homepage = await Homepage.findOne();
    
    if (!homepage || !homepage.hero.featuredAuctionId) {
      return res.json({
        success: true,
        data: null,
        message: 'No featured auction set'
      });
    }

    // Get the featured auction with images
    const auction = await Auction.findById(homepage.hero.featuredAuctionId)
      .populate('sellerId', 'name')
      .populate('categoryId', 'name');

    if (!auction) {
      return res.json({
        success: true,
        data: null,
        message: 'Featured auction not found'
      });
    }

    // Get auction images
    const images = await AuctionImage.find({ auctionId: auction._id });

    // Calculate time remaining
    const now = new Date();
    const endTime = new Date(auction.endTime);
    const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
    
    // Convert to hours, minutes, seconds
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    const timeRemainingFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Get base URL for images
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      data: {
        id: auction._id,
        title: auction.title,
        description: auction.description,
        currentBid: auction.currentBid || auction.basePrice,
        basePrice: auction.basePrice,
        timeRemaining: timeRemainingFormatted,
        timeRemainingMs: timeRemaining,
        status: auction.status,
        images: images.map(img => ({
          url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
          isPrimary: img.isPrimary
        })),
        seller: auction.sellerId?.name || 'Unknown',
        category: auction.categoryId?.name || 'Uncategorized',
        endTime: auction.endTime,
        isActive: auction.status === 'ACTIVE' && timeRemaining > 0
      }
    });
  } catch (error) {
    console.error('Get featured auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured auction'
    });
  }
});

// GET auctions for admin selection (admin only)
router.get('/auctions-for-selection', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get active auctions with basic info for admin selection
    const auctions = await Auction.find({ 
      status: { $in: ['ACTIVE', 'SCHEDULED'] },
      isActive: true
    })
    .populate('categoryId', 'name')
    .populate('sellerId', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    // Get images for each auction
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const auctionsWithImages = await Promise.all(
      auctions.map(async (auction) => {
        const images = await AuctionImage.find({ auctionId: auction._id }).limit(1);
        const primaryImage = images.find(img => img.isPrimary) || images[0];
        
        return {
          _id: auction._id,
          title: auction.title,
          currentBid: auction.currentBid || auction.basePrice,
          basePrice: auction.basePrice,
          status: auction.status,
          category: auction.categoryId?.name || 'Uncategorized',
          seller: auction.sellerId?.name || 'Unknown',
          endTime: auction.endTime,
          primaryImage: primaryImage ? (primaryImage.url.startsWith('http') ? primaryImage.url : `${baseUrl}${primaryImage.url}`) : null,
          createdAt: auction.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: auctionsWithImages,
      message: `Found ${auctionsWithImages.length} auctions available for selection`
    });
  } catch (error) {
    console.error('Get auctions for selection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auctions for selection'
    });
  }
});

module.exports = router; 