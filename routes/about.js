const express = require('express');
const router = express.Router();
const AboutContent = require('../models/About');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Public routes

// Get about page content
router.get('/content', async (req, res) => {
  try {
    let content = await AboutContent.findOne({ isActive: true });
    
    if (!content) {
      // Create default content if none exists
      content = await AboutContent.create({
        hero: {
          title: "About PakistanAuction",
          subtitle: "Learn more about our story, mission, and the team behind PakistanAuction."
        },
        story: {
          title: "Our Story",
          content: [
            { paragraph: "PakistanAuction was founded in 2018 with a simple mission: to create a premium online auction platform that connects sellers with buyers in a secure, transparent, and engaging environment." },
            { paragraph: "Our founder, Michael Chen, an avid collector of vintage electronics and art, was frustrated with the limitations of existing auction platforms. He envisioned a platform that would not only provide a seamless bidding experience but also ensure that only serious bidders participated in auctions." },
            { paragraph: "This led to the development of our unique 10% entry fee model, which has proven to create a more committed bidding environment and better outcomes for both buyers and sellers." },
            { paragraph: "Today, PakistanAuction has grown into a thriving marketplace with thousands of successful auctions completed each month across diverse categories including antiques, electronics, art, and collectibles." }
          ],
          image: {
            url: "https://images.pexels.com/photos/2284169/pexels-photo-2284169.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
            alt: "PakistanAuction Team"
          }
        },
        mission: {
          title: "Our Mission",
          subtitle: "To create the most trusted online auction platform where buyers and sellers can connect with confidence.",
          values: [
            {
              title: "Trust & Security",
              description: "We prioritize creating a secure environment with verified users and secure transactions.",
              icon: "fas fa-shield-alt"
            },
            {
              title: "Fairness",
              description: "Our 10% entry fee model ensures only serious bidders participate, creating a fair bidding environment.",
              icon: "fas fa-balance-scale"
            },
            {
              title: "Quality",
              description: "We curate high-quality, unique items and provide detailed, accurate descriptions for all auctions.",
              icon: "fas fa-gem"
            }
          ]
        },
        team: {
          title: "Meet Our Team",
          members: [
            {
              name: "Michael Chen",
              position: "Founder & CEO",
              bio: "Passionate collector and entrepreneur with over 15 years of experience in e-commerce and online marketplaces.",
              image: "https://images.pexels.com/photos/7472428/pexels-photo-7472428.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
              socialLinks: [
                { platform: "linkedin", url: "#" },
                { platform: "twitter", url: "#" },
                { platform: "email", url: "#" }
              ]
            },
            {
              name: "Sarah Johnson",
              position: "Chief Operations Officer",
              bio: "Former auction house executive with expertise in logistics, customer service, and operational excellence.",
              image: "https://images.pexels.com/photos/8871904/pexels-photo-8871904.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
              socialLinks: [
                { platform: "linkedin", url: "#" },
                { platform: "twitter", url: "#" },
                { platform: "email", url: "#" }
              ]
            },
            {
              name: "David Rodriguez",
              position: "Chief Technology Officer",
              bio: "Tech innovator with a background in fintech and secure payment systems, leading our platform development.",
              image: "https://images.pexels.com/photos/26692091/pexels-photo-26692091/free-photo-of-a-businessman-sitting-at-the-desk-with-a-laptop.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
              socialLinks: [
                { platform: "linkedin", url: "#" },
                { platform: "twitter", url: "#" },
                { platform: "email", url: "#" }
              ]
            },
            {
              name: "Emily Wong",
              position: "Head of Marketing",
              bio: "Creative marketing strategist with experience in luxury brands and digital marketing campaigns.",
              image: "https://images.pexels.com/photos/26692095/pexels-photo-26692095/free-photo-of-a-businesswoman-sitting-at-the-desk.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
              socialLinks: [
                { platform: "linkedin", url: "#" },
                { platform: "twitter", url: "#" },
                { platform: "email", url: "#" }
              ]
            }
          ]
        },
        stats: {
          title: "Our Numbers",
          items: [
            { number: "5K+", label: "Active Auctions", icon: "fas fa-gavel" },
            { number: "50K+", label: "Registered Users", icon: "fas fa-users" },
            { number: "98%", label: "Satisfaction Rate", icon: "fas fa-star" },
            { number: "$10M+", label: "Monthly Sales", icon: "fas fa-dollar-sign" }
          ]
        },
        testimonials: {
          title: "What Our Users Say",
          items: [
            {
              name: "Robert Thompson",
              position: "Antique Dealer",
              content: "As a seller, I appreciate PakistanAuction's entry fee system. It ensures that only serious buyers participate in my auctions, resulting in better prices and fewer issues after the sale.",
              rating: 5,
              avatar: "https://via.placeholder.com/50"
            },
            {
              name: "Jennifer Lee",
              position: "Photography Enthusiast",
              content: "I've been collecting vintage cameras for years, and PakistanAuction has become my go-to platform. The quality of items and the secure bidding process make it stand out from other auction sites.",
              rating: 5,
              avatar: "https://via.placeholder.com/50"
            },
            {
              name: "Marcus Wilson",
              position: "Tech Collector",
              content: "The customer service at PakistanAuction is exceptional. When I had an issue with a purchase, their team resolved it quickly and professionally. Their commitment to user satisfaction is evident.",
              rating: 4.5,
              avatar: "https://via.placeholder.com/50"
            }
          ]
        }
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching about content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch about content'
    });
  }
});

// Admin routes

// Update about content
router.put('/content', verifyToken, requireAdmin, async (req, res) => {
  try {
    const content = await AboutContent.findOneAndUpdate(
      { isActive: true },
      req.body,
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'About content updated successfully',
      data: content
    });
  } catch (error) {
    console.error('Error updating about content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update about content'
    });
  }
});

// Update specific sections
router.patch('/content/:section', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { section } = req.params;
    const allowedSections = ['hero', 'story', 'mission', 'team', 'stats', 'testimonials'];
    
    if (!allowedSections.includes(section)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section'
      });
    }

    const updateData = {};
    updateData[section] = req.body;

    const content = await AboutContent.findOneAndUpdate(
      { isActive: true },
      updateData,
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: `About ${section} section updated successfully`,
      data: content
    });
  } catch (error) {
    console.error(`Error updating about ${section} section:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to update about ${section} section`
    });
  }
});

module.exports = router; 