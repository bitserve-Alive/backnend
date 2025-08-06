const express = require('express');
const router = express.Router();
const { ContactContent, ContactSubmission } = require('../models/Contact');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Public routes

// Get contact page content
router.get('/content', async (req, res) => {
  try {
    let content = await ContactContent.findOne({ isActive: true });
    
    if (!content) {
      // Create default contact content
      content = new ContactContent({
        title: 'Contact Us',
        subtitle: "We're here to help. Reach out to us with any questions or concerns.",
        address: {
          street: '123 Auction St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States'
        },
        phones: [
          { number: '+1 (555) 123-4567', label: 'Main Office' },
          { number: '+1 (555) 987-6543', label: 'Customer Support' }
        ],
        emails: [
          { email: 'info@PakistanAuction.com', label: 'General Inquiries' },
          { email: 'support@PakistanAuction.com', label: 'Customer Support' }
        ],
        workingHours: [
          { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
          { day: 'Saturday', hours: '10:00 AM - 4:00 PM' },
          { day: 'Sunday', hours: 'Closed' }
        ],
        socialMedia: [
          { platform: 'Facebook', url: 'https://facebook.com/pakistanauction', icon: 'fab fa-facebook-f' },
          { platform: 'Twitter', url: 'https://twitter.com/pakistanauction', icon: 'fab fa-twitter' },
          { platform: 'Instagram', url: 'https://instagram.com/pakistanauction', icon: 'fab fa-instagram' },
          { platform: 'LinkedIn', url: 'https://linkedin.com/company/pakistanauction', icon: 'fab fa-linkedin-in' }
        ],
        faq: [
          {
            question: 'How do I contact customer support?',
            answer: 'You can contact our customer support team through this contact form, by emailing support@PakistanAuction.com, or by calling our customer service line at +1 (555) 123-4567 during our business hours.',
            order: 0
          },
          {
            question: 'What is your response time for inquiries?',
            answer: 'We strive to respond to all inquiries within 24 hours during business days. For urgent matters, we recommend calling our customer service line for immediate assistance.',
            order: 1
          },
          {
            question: 'How can I report an issue with an auction?',
            answer: 'If you encounter any issues with an auction, please contact us immediately through our contact form or by emailing support@PakistanAuction.com. Include the auction ID, a description of the issue, and any relevant screenshots to help us resolve the matter quickly.',
            order: 2
          },
          {
            question: 'Do you have a physical location I can visit?',
            answer: 'Yes, our main office is located at 123 Auction St, New York, NY 10001. You\'re welcome to visit us during our business hours. For specific inquiries or to schedule an appointment, please contact us in advance.',
            order: 3
          }
        ],
        mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095343008!2d-74.00425882426698!3d40.74076987932881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sNew%20York%2C%20NY%2010001!5e0!3m2!1sen!2sus!4v1682452776955!5m2!1sen!2sus'
      });
      
      await content.save();
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching contact content:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Submit contact form
router.post('/submit', [
  body('name').notEmpty().trim().isLength({ min: 2 }).withMessage('Name is required and must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('subject').notEmpty().trim().isLength({ min: 5 }).withMessage('Subject is required and must be at least 5 characters'),
  body('message').notEmpty().trim().isLength({ min: 10 }).withMessage('Message is required and must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, subject, message } = req.body;

    const submission = await ContactSubmission.create({
      name,
      email,
      subject,
      message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Thank you for your message! We will get back to you within 24 hours.',
      data: {
        id: submission._id
      }
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form'
    });
  }
});

// Admin routes

// Get all contact submissions
router.get('/submissions', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const submissions = await ContactSubmission.find(query)
      .populate('respondedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ContactSubmission.countDocuments(query);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact submissions'
    });
  }
});

// Update contact submission status
router.patch('/submissions/:id', verifyToken, requireAdmin, [
  body('status').isIn(['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).withMessage('Invalid status'),
  body('adminNotes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const updateData = { status };
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.respondedAt = new Date();
      updateData.respondedBy = req.user.id;
    }

    const submission = await ContactSubmission.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('respondedBy', 'firstName lastName email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error updating contact submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact submission'
    });
  }
});

// Update contact content
router.put('/content', verifyToken, requireAdmin, async (req, res) => {
  try {
    const content = await ContactContent.findOneAndUpdate(
      { isActive: true },
      req.body,
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Contact content updated successfully',
      data: content
    });
  } catch (error) {
    console.error('Error updating contact content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact content'
    });
  }
});

// Delete contact submission
router.delete('/submissions/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await ContactSubmission.findByIdAndDelete(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact submission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact submission'
    });
  }
});

module.exports = router; 