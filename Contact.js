const mongoose = require('mongoose');

// Contact page content schema
const contactContentSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Contact Us'
  },
  subtitle: {
    type: String,
    default: "We're here to help. Reach out to us with any questions or concerns."
  },
  address: {
    street: {
      type: String,
      default: '123 Auction St'
    },
    city: {
      type: String,
      default: 'New York'
    },
    state: {
      type: String,
      default: 'NY'
    },
    zipCode: {
      type: String,
      default: '10001'
    },
    country: {
      type: String,
      default: 'United States'
    }
  },
  phones: [{
    number: String,
    label: String
  }],
  emails: [{
    email: String,
    label: String
  }],
  workingHours: [{
    day: String,
    hours: String
  }],
  socialMedia: [{
    platform: String,
    url: String,
    icon: String
  }],
  faq: [{
    question: String,
    answer: String,
    order: {
      type: Number,
      default: 0
    }
  }],
  mapEmbedUrl: {
    type: String,
    default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095343008!2d-74.00425882426698!3d40.74076987932881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sNew%20York%2C%20NY%2010001!5e0!3m2!1sen!2sus!4v1682452776955!5m2!1sen!2sus'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Contact form submission schema
const contactSubmissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'NEW'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  respondedAt: Date,
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

const ContactContent = mongoose.model('ContactContent', contactContentSchema);
const ContactSubmission = mongoose.model('ContactSubmission', contactSubmissionSchema);

module.exports = {
  ContactContent,
  ContactSubmission
}; 