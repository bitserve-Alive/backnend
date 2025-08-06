const mongoose = require('mongoose');

const homepageSchema = new mongoose.Schema({
  // Hero Section
  hero: {
    title: {
      type: String,
      default: "Discover Unique Items at Unbeatable Prices"
    },
    subtitle: {
      type: String,
      default: "Join thousands of bidders in the most exciting online auction platform. Find treasures and bid with confidence."
    },
    primaryButtonText: {
      type: String,
      default: "Browse Auctions"
    },
    secondaryButtonText: {
      type: String,
      default: "Start Bidding"
    },
    statsText: {
      type: String,
      default: "Joined by 10,000+ bidders this month"
    },
    backgroundImage: {
      type: String,
      default: "https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg"
    },
    featuredAuctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      default: null
    }
  },

  // Explore Store Section
  exploreStore: {
    title: {
      type: String,
      default: "Explore Our Store"
    },
    subtitle: {
      type: String,
      default: "Curated collections across categories — antiques, art, luxury, and more."
    },
    categories: [{
      title: String,
      description: String,
      itemCount: String,
      image: String,
      link: String
    }]
  },

  // Sell To Us Section
  sellToUs: {
    title: {
      type: String,
      default: "Sell Your Valuable Items To Us"
    },
    subtitle: {
      type: String,
      default: "Have valuable items you want to sell? Our platform offers a seamless selling experience with expert appraisals, competitive pricing, and a global audience of eager buyers."
    },
    features: [{
      icon: String,
      title: String,
      description: String
    }],
    primaryButtonText: {
      type: String,
      default: "Start Selling"
    },
    secondaryButtonText: {
      type: String,
      default: "Learn More"
    }
  },

  // How It Works Section
  howItWorks: {
    title: {
      type: String,
      default: "How It Works"
    },
    subtitle: {
      type: String,
      default: "Our auction platform is designed to be simple and transparent. Follow these steps to start bidding on your favorite items."
    },
    steps: [{
      stepNumber: Number,
      title: String,
      description: String,
      icon: String,
      features: [String]
    }]
  },

  // Testimonials Section
  testimonials: {
    title: {
      type: String,
      default: "What Our Users Say"
    },
    subtitle: {
      type: String,
      default: "Don't just take our word for it. Here's what our community of bidders and sellers have to say about their experience."
    },
    items: [{
      name: String,
      position: String,
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
      },
      content: String,
      avatar: String
    }]
  },

  // Newsletter Section
  newsletter: {
    title: {
      type: String,
      default: "Stay Updated on New Auctions"
    },
    subtitle: {
      type: String,
      default: "Subscribe to our newsletter to receive updates on new auctions, exclusive offers, and tips for finding the best deals on our platform."
    },
    buttonText: {
      type: String,
      default: "Subscribe"
    },
    privacyText: {
      type: String,
      default: "We respect your privacy. Unsubscribe at any time."
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Homepage', homepageSchema); 