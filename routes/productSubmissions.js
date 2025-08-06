const express = require('express');
const ProductSubmission = require('../models/ProductSubmission');
const Auction = require('../models/Auction');
const Category = require('../models/Category');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { uploadAuctionImages, handleUploadError } = require('../middleware/upload');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

// PUBLIC ROUTES

// Submit a new product (public - no auth required)
router.post('/submit', optionalAuth, uploadAuctionImages, async (req, res) => {
  try {
    const {
      sellerName,
      sellerEmail,
      sellerPhone,
      city,
      productName,
      brand,
      category,
      condition,
      price,
      description
    } = req.body;

    console.log('📋 Product submission received:');
    console.log('- Product:', productName);
    console.log('- Category:', category);
    console.log('- Price:', price);
    console.log('- Files:', req.files?.length || 0);

    // Comprehensive validation
    const validationErrors = [];

    // Personal Information validation
    if (!sellerName || sellerName.trim().length < 2) {
      validationErrors.push('Seller name must be at least 2 characters');
    }
    if (!sellerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerEmail)) {
      validationErrors.push('Please provide a valid email address');
    }
    if (!sellerPhone || !/^03\d{2}-?\d{7}$/.test(sellerPhone)) {
      validationErrors.push('Please provide a valid Pakistani phone number (03xx-xxxxxxx)');
    }
    if (!city || city.trim().length < 2) {
      validationErrors.push('City name must be at least 2 characters');
    }

    // Product Information validation
    if (!productName || productName.trim().length < 3) {
      validationErrors.push('Product name must be at least 3 characters');
    }
    if (!category) {
      validationErrors.push('Please select a category');
    } else {
      const validCategories = ['Electronics', 'Computers', 'Phones & Tablets', 'Furniture', 'Clothing', 'Books', 'Vehicles', 'Antiques', 'Art', 'Jewelry', 'Collectibles', 'Art & Collectibles', 'Other'];
      if (!validCategories.includes(category)) {
        validationErrors.push(`Invalid category. Please select from: ${validCategories.join(', ')}`);
      }
    }
    if (!condition) {
      validationErrors.push('Please select a condition');
    } else {
      const validConditions = ['Brand New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'];
      if (!validConditions.includes(condition)) {
        validationErrors.push(`Invalid condition. Please select from: ${validConditions.join(', ')}`);
      }
    }
    if (!price || isNaN(price) || parseInt(price) < 1 || parseInt(price) > 99999999) {
      validationErrors.push('Price must be between ₨1 and ₨99,999,999');
    }
    if (!description || description.trim().length < 10) {
      validationErrors.push('Description must be at least 10 characters');
    }

    // Image validation
    if (!req.files || req.files.length === 0) {
      validationErrors.push('At least one product image is required');
    } else if (req.files.length > 5) {
      validationErrors.push('Maximum 5 images allowed');
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      console.log('❌ Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Process uploaded images
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const images = req.files.map((file, index) => {
      // Validate individual image
      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error(`Image ${file.originalname} is too large. Maximum size is 5MB.`);
      }
      
      return {
        url:`/uploads/auctions/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        order: index
      };
    });

    // Create submission with validated data
    const submission = new ProductSubmission({
      sellerName: sellerName.trim(),
      sellerEmail: sellerEmail.trim().toLowerCase(),
      sellerPhone: sellerPhone.trim(),
      city: city.trim(),
      productName: productName.trim(),
      brand: brand?.trim() || '',
      category,
      condition,
      expectedPrice: parseInt(price),
      description: description.trim(),
      images,
      userId: req.user?.id || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await submission.save();

    console.log('✅ Product submitted successfully:', submission._id);

    // Send WhatsApp notification to admins
    try {
      console.log('📱 Sending WhatsApp notifications to admins...');
      const whatsappResults = await whatsappService.notifyProductSubmission(submission);
      
      console.log('📱 WhatsApp notification results:', whatsappResults);
      
      // Log results for monitoring
      const successCount = whatsappResults.filter(r => r.success).length;
      const totalCount = whatsappResults.length;
      
      if (successCount > 0) {
        console.log(`✅ WhatsApp notifications sent successfully to ${successCount}/${totalCount} admins`);
      } else {
        console.warn('⚠️ No WhatsApp notifications were sent successfully');
      }
      
    } catch (whatsappError) {
      // Don't fail the submission if WhatsApp fails
      console.error('❌ WhatsApp notification error (non-critical):', whatsappError);
    }

    res.status(201).json({
      success: true,
      message: 'Product submitted successfully! Our team will review it within 24-48 hours.',
      data: {
        submissionId: submission._id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        estimatedReviewTime: '24-48 hours'
      }
    });

  } catch (error) {
    console.error('❌ Product submission error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle file upload errors
    if (error.message.includes('too large')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit product. Please try again.',
      errors: ['Internal server error. Please contact support if this persists.']
    });
  }
});

// Get submission status (public - by email or submission ID)
router.get('/status/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let submission;
    
    // Try to find by ID first, then by email
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      submission = await ProductSubmission.findById(identifier);
    } else {
      submission = await ProductSubmission.findOne({ 
        sellerEmail: identifier.toLowerCase() 
      }).sort({ submittedAt: -1 }); // Get latest submission for email
    }

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: submission._id,
        productName: submission.productName,
        status: submission.status,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
        adminNotes: submission.adminNotes,
        timeSinceSubmission: submission.timeSinceSubmission
      }
    });

  } catch (error) {
    console.error('Get submission status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get submission status'
    });
  }
});

// ADMIN ROUTES

// Get all submissions with filtering and pagination (admin only)
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = {};
    
    if (status) {
      filter.status = status.toUpperCase();
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { sellerName: { $regex: search, $options: 'i' } },
        { sellerEmail: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get submissions
    const submissions = await ProductSubmission.find(filter)
      .populate('reviewedBy', 'firstName lastName username')
      .populate('userId', 'firstName lastName username email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await ProductSubmission.countDocuments(filter);
    const statusCounts = await ProductSubmission.getStatusCounts();

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNext: skip + parseInt(limit) < totalCount,
          hasPrev: parseInt(page) > 1
        },
        statusCounts
      }
    });

  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
});

// Update submission status (admin only)
router.put('/admin/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const submission = await ProductSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const oldStatus = submission.status;
    
    // Update status
    submission.status = status.toUpperCase();
    submission.adminNotes = adminNotes || '';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();

    await submission.save();

    // Send WhatsApp notification to seller if status changed
    if (oldStatus !== submission.status) {
      try {
        console.log('📱 Sending WhatsApp status update notification to seller...');
        const whatsappResult = await whatsappService.notifyStatusUpdate(
          submission, 
          submission.status, 
          adminNotes || ''
        );
        
        if (whatsappResult.success) {
          console.log('✅ WhatsApp status update sent successfully to seller');
        } else {
          console.warn('⚠️ WhatsApp status update failed (non-critical):', whatsappResult.error);
        }
        
      } catch (whatsappError) {
        // Don't fail the status update if WhatsApp fails
        console.error('❌ WhatsApp status notification error (non-critical):', whatsappError);
      }
    }

    // Populate the updated submission
    await submission.populate('reviewedBy', 'firstName lastName username');

    res.json({
      success: true,
      message: `Submission ${status.toLowerCase()} successfully`,
      data: submission
    });

  } catch (error) {
    console.error('Update submission status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update submission status'
    });
  }
});

// Convert submission to auction (admin only)
router.post('/admin/:id/convert-to-auction', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      basePrice,
      bidIncrement = 10,
      entryFee,
      endTime,
      startTime,
      categoryId
    } = req.body;

    const submission = await ProductSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    if (submission.status === 'CONVERTED_TO_AUCTION') {
      return res.status(400).json({
        success: false,
        message: 'Submission already converted to auction'
      });
    }

    // Create auction from submission
    const auction = new Auction({
      title: submission.productName,
      description: submission.description,
      brand: submission.brand,
      condition: submission.condition.replace(' ', '_').toUpperCase(),
      basePrice: parseFloat(basePrice),
      bidIncrement: parseFloat(bidIncrement),
      entryFee: entryFee ? parseFloat(entryFee) : (parseFloat(basePrice) * 0.1),
      sellerId: req.user.id, // Admin creates it on behalf
      categoryId: categoryId,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: new Date(endTime),
      status: new Date(startTime || Date.now()) > new Date() ? 'SCHEDULED' : 'ACTIVE',
      isFeatured: false,
      
      // Add seller contact info to description
      originalSubmission: {
        sellerName: submission.sellerName,
        sellerEmail: submission.sellerEmail,
        sellerPhone: submission.sellerPhone,
        city: submission.city,
        submissionId: submission._id
      }
    });

    await auction.save();

    // Create auction images from submission images
    const AuctionImage = require('../models/AuctionImage');
    const imagePromises = submission.images.map((img, index) => {
      const auctionImage = new AuctionImage({
        auctionId: auction._id,
        url: img.url,
        filename: img.filename,
        originalName: img.originalName,
        size: img.size,
        order: index,
        isMain: index === 0
      });
      return auctionImage.save();
    });

    await Promise.all(imagePromises);

    // Update submission status
    submission.status = 'CONVERTED_TO_AUCTION';
    submission.auctionId = auction._id;
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();
    submission.adminNotes = `Converted to auction (ID: ${auction._id})`;

    await submission.save();

    // Send WhatsApp notification to seller about conversion
    try {
      console.log('📱 Sending WhatsApp auction conversion notification to seller...');
      const whatsappResult = await whatsappService.notifyStatusUpdate(
        submission, 
        'CONVERTED_TO_AUCTION', 
        `Your product has been converted to auction #${auction._id}. Auction starts at ${auction.startTime.toLocaleString()} and ends at ${auction.endTime.toLocaleString()}.`
      );
      
      if (whatsappResult.success) {
        console.log('✅ WhatsApp auction conversion notification sent successfully to seller');
      } else {
        console.warn('⚠️ WhatsApp auction conversion notification failed (non-critical):', whatsappResult.error);
      }
      
    } catch (whatsappError) {
      // Don't fail the conversion if WhatsApp fails
      console.error('❌ WhatsApp auction conversion notification error (non-critical):', whatsappError);
    }

    res.json({
      success: true,
      message: 'Submission successfully converted to auction',
      data: {
        auction: auction,
        submission: submission
      }
    });

  } catch (error) {
    console.error('Convert to auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert submission to auction'
    });
  }
});

// Delete submission (admin only)
router.delete('/admin/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await ProductSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Delete associated images from filesystem
    const fs = require('fs');
    const path = require('path');
    
    submission.images.forEach(image => {
      const imagePath = path.join(__dirname, '..', 'uploads', 'auctions', image.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    await ProductSubmission.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete submission'
    });
  }
});

module.exports = router; 