const express = require('express');
const { uploadAuctionImages, handleUploadError } = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');
const AuctionImage = require('../models/AuctionImage');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Clean up orphaned images (images uploaded but not associated with any auction)
router.delete('/cleanup-orphaned', verifyToken, async (req, res) => {
  try {
    const { imageFilenames } = req.body;
    
    if (!imageFilenames || !Array.isArray(imageFilenames)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image filenames provided'
      });
    }

    let deletedCount = 0;
    for (const filename of imageFilenames) {
      try {
        const imagePath = path.join(__dirname, '..', 'uploads', 'auctions', filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          deletedCount++;
          console.log(`Cleaned up orphaned image: ${filename}`);
        }
      } catch (error) {
        console.error(`Error deleting image ${filename}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} orphaned images`,
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup orphaned images'
    });
  }
});

// Upload images and return URLs
router.post('/upload', verifyToken, (req, res, next) => {
  uploadAuctionImages(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    // Return image URLs with additional metadata
    const imageUrls = req.files.map(file => ({
      url: `/uploads/auctions/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));

    console.log('Returning image URLs:', imageUrls);

    res.json({
      success: true,
      message: `${req.files.length} image(s) uploaded successfully`,
      data: { 
        images: imageUrls
      }
    });
  });
});

module.exports = router; 