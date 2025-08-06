const mongoose = require('mongoose');

// About page content schema
const aboutContentSchema = new mongoose.Schema({
  // Hero section
  hero: {
    title: {
      type: String,
      default: 'About PakistanAuction'
    },
    subtitle: {
      type: String,
      default: 'Learn more about our story, mission, and the team behind PakistanAuction.'
    }
  },
  
  // Our Story section
  story: {
    title: {
      type: String,
      default: 'Our Story'
    },
    content: [{
      paragraph: String
    }],
    image: {
      url: String,
      alt: String
    }
  },
  
  // Mission section
  mission: {
    title: {
      type: String,
      default: 'Our Mission'
    },
    subtitle: {
      type: String,
      default: 'To create the most trusted online auction platform where buyers and sellers can connect with confidence.'
    },
    values: [{
      title: String,
      description: String,
      icon: String
    }]
  },
  
  // Team section
  team: {
    title: {
      type: String,
      default: 'Meet Our Team'
    },
    members: [{
      name: String,
      position: String,
      bio: String,
      image: String,
      socialLinks: [{
        platform: String,
        url: String
      }]
    }]
  },
  
  // Stats section
  stats: {
    title: {
      type: String,
      default: 'PakistanAuction by the Numbers'
    },
    items: [{
      number: String,
      label: String,
      icon: String
    }]
  },
  
  // Testimonials section
  testimonials: {
    title: {
      type: String,
      default: 'What Our Users Say'
    },
    items: [{
      name: String,
      position: String,
      content: String,
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
      },
      avatar: String
    }]
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const AboutContent = mongoose.model('AboutContent', aboutContentSchema);

module.exports = AboutContent; 