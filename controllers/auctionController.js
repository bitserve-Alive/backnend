const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Auction = require('../models/Auction');
const Category = require('../models/Category');
const Bid = require('../models/Bid');
const Watchlist = require('../models/Watchlist');
const AuctionImage = require('../models/AuctionImage');
const AuctionService = require('../services/auctionService');

// Create new auction
const createAuction = async (req, res) => {
  try {
    const {
      title,
      description,
      brand,
      condition,
      basePrice,
      bidIncrement,
      entryFee,
      reservePrice,
      buyNowPrice,
      categoryId,
      endTime,
      startTime,
      images,
      isFeatured
    } = req.body;

    console.log('Received auction data:', req.body);

    // Validate and convert numbers
    const parsedBasePrice = parseFloat(basePrice);
    const parsedBidIncrement = parseFloat(bidIncrement) || 10;
    const parsedEntryFee = parseFloat(entryFee) || (parsedBasePrice * 0.1);
    const parsedReservePrice = reservePrice ? parseFloat(reservePrice) : 0;
    const parsedBuyNowPrice = buyNowPrice ? parseFloat(buyNowPrice) : 0;

    // Validate required numeric fields
    if (isNaN(parsedBasePrice) || parsedBasePrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid base price is required and must be greater than 0'
      });
    }

    if (isNaN(parsedBidIncrement) || parsedBidIncrement <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid bid increment is required and must be greater than 0'
      });
    }

    // Validate dates
    const startDate = startTime ? new Date(startTime) : new Date();
    const endDate = new Date(endTime);

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Valid end time is required'
      });
    }

    if (endDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'End time must be in the future'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Validate required fields
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be at least 3 characters'
      });
    }

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description is required and must be at least 10 characters'
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const auction = new Auction({
      title: title.trim(),
      description: description.trim(),
      brand: brand ? brand.trim() : '',
      condition: condition || 'NEW',
      basePrice: parsedBasePrice,
      bidIncrement: parsedBidIncrement,
      entryFee: parsedEntryFee,
      reservePrice: parsedReservePrice,
      buyNowPrice: parsedBuyNowPrice,
        sellerId: req.user.id,
        categoryId,
      startTime: startDate,
      endTime: endDate,
      status: startDate > new Date() ? 'SCHEDULED' : 'ACTIVE',
      isFeatured: Boolean(isFeatured)
    });

    await auction.save();

    // Handle images if provided
    let savedImages = [];
    console.log('Images received in createAuction:', images);
    if (images && Array.isArray(images) && images.length > 0) {
      console.log('Processing images, count:', images.length);
      const imagePromises = images.map((image, index) => {
        console.log(`Creating image ${index}:`, image);
        const imageData = new AuctionImage({
          auctionId: auction._id,
          url: image.url,
          filename: image.filename,
          originalName: image.originalName,
          size: image.size,
          order: index,
          isMain: index === 0 // First image is main image
        });
        return imageData.save();
      });

      savedImages = await Promise.all(imagePromises);
      console.log('Saved images:', savedImages.length);
    } else {
      console.log('No images to process');
    }

    // Populate the auction with related data
    const populatedAuction = await Auction.findById(auction._id)
      .populate('sellerId', 'firstName lastName username')
      .populate('categoryId');

    // Get counts
    const [bidCount, watchlistCount] = await Promise.all([
      Bid.countDocuments({ auctionId: auction._id }),
      Watchlist.countDocuments({ auctionId: auction._id })
    ]);

    const auctionData = {
      ...populatedAuction.toObject(),
      id: populatedAuction._id.toString(),
      seller: populatedAuction.sellerId,
      category: populatedAuction.categoryId,
      images: savedImages,
        _count: {
        bids: bidCount,
        watchlist: watchlistCount
      }
    };

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      data: { auction: auctionData }
    });

  } catch (error) {
    console.error('Create auction error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create auction'
    });
  }
};

// Get all auctions with filtering and pagination
const getAuctions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      isFeatured
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter - removed default status filter to show all auctions
    const filter = {
      isActive: true
    };

    // Only add status filter if specifically provided
    if (status && status.trim() !== '') {
      filter.status = status.toUpperCase();
    }

    if (category) {
      // Check if category is an ObjectId or a slug
      if (mongoose.Types.ObjectId.isValid(category)) {
        // If it's a valid ObjectId, use it directly
        filter.categoryId = category;
      } else {
        // If it's a slug, look up the category ObjectId
        try {
          const categoryDoc = await Category.findOne({ slug: category.toLowerCase() });
          if (categoryDoc) {
            filter.categoryId = categoryDoc._id;
          } else {
            // If category not found, return empty results
            return res.json({
              success: true,
              data: {
                auctions: [],
                totalCount: 0,
                currentPage: parseInt(page),
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false
              }
            });
          }
        } catch (slugLookupError) {
          console.error('Error looking up category by slug:', slugLookupError);
          // Fall back to treating it as ObjectId (original behavior)
          filter.categoryId = category;
        }
      }
    }

    // Add featured filter
    if (isFeatured !== undefined && isFeatured !== '') {
      filter.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
    }

    // Build sort object - prioritize featured auctions if not explicitly sorting by featured
    const sort = {};
    if (sortBy === 'featured') {
      sort.isFeatured = sortOrder === 'desc' ? -1 : 1;
      sort.createdAt = -1; // Secondary sort by creation date
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Get auctions
    const auctions = await Auction.find(filter)
      .populate('sellerId', 'firstName lastName username')
      .populate('categoryId')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Auction.countDocuments(filter);

    // Get additional data for each auction
    const auctionsWithCounts = await Promise.all(
      auctions.map(async (auction) => {
        const [bidCount, watchlistCount, images] = await Promise.all([
          Bid.countDocuments({ auctionId: auction._id }),
          Watchlist.countDocuments({ auctionId: auction._id }),
          AuctionImage.find({ auctionId: auction._id }).sort({ order: 1 })
        ]);

        return {
          ...auction.toObject(),
          id: auction._id.toString(),
          seller: auction.sellerId,
          category: auction.categoryId,
          images: images || [],
          _count: {
            bids: bidCount,
            watchlist: watchlistCount
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        auctions: auctionsWithCounts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNext: skip + parseInt(limit) < totalCount,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auctions'
    });
  }
};

// Get single auction by ID
const getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get additional data
    const [bidCount, watchlistCount, images, bids] = await Promise.all([
      Bid.countDocuments({ auctionId: id }),
      Watchlist.countDocuments({ auctionId: id }),
      AuctionImage.find({ auctionId: id }).sort({ order: 1 }),
      Bid.find({ auctionId: id })
        .populate('bidderId', 'firstName lastName username profilePhoto')
        .sort({ amount: -1 })
        .limit(10)
    ]);

    // Increment view count and get updated auction with new view count
    const updatedAuction = await Auction.findByIdAndUpdate(
      id, 
      { $inc: { viewCount: 1 } },
      { new: true } // Return the updated document
    ).populate('sellerId', 'firstName lastName username createdAt')
     .populate('categoryId');

    if (!updatedAuction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    const auctionData = {
      ...updatedAuction.toObject(),
      id: updatedAuction._id.toString(),
      seller: updatedAuction.sellerId,
      category: updatedAuction.categoryId,
      images,
      bids,
      _count: {
        bids: bidCount,
        watchlist: watchlistCount
      }
    };

    res.json({
      success: true,
      data: { auction: auctionData }
    });

  } catch (error) {
    console.error('Get auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auction'
    });
  }
};

// Update auction
const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find auction and check ownership
    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (auction.sellerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this auction'
      });
    }

    // Check if auction can be updated (only DRAFT or SCHEDULED auctions)
    // if (!['DRAFT', 'SCHEDULED'].includes(auction.status)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Cannot update auction that is already active or completed'
    //   });
    // }

    const {
      title,
      description,
      brand,
      condition,
      basePrice,
      bidIncrement,
      entryFee,
      reservePrice,
      buyNowPrice,
      categoryId,
      endTime,
      startTime,
      images,
      isFeatured
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (brand) updateData.brand = brand;
    if (condition) updateData.condition = condition;
    if (basePrice) updateData.basePrice = parseFloat(basePrice);
    if (bidIncrement) updateData.bidIncrement = parseFloat(bidIncrement);
    if (entryFee !== undefined) updateData.entryFee = parseFloat(entryFee);
    if (reservePrice !== undefined) updateData.reservePrice = parseFloat(reservePrice);
    if (buyNowPrice !== undefined) updateData.buyNowPrice = parseFloat(buyNowPrice);
    if (categoryId) updateData.categoryId = categoryId;
    if (endTime) updateData.endTime = new Date(endTime);
    if (startTime) updateData.startTime = new Date(startTime);
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);

    // Handle image updates
    if (images !== undefined) {
      try {
        // Get current images
        const currentImages = await AuctionImage.find({ auctionId: id });
        const fs = require('fs');
        const path = require('path');
        
        // Delete removed images
        for (const currentImage of currentImages) {
          const stillExists = images.find(img => img.filename === currentImage.filename);
          if (!stillExists) {
            // Delete file from filesystem
            const imagePath = path.join(__dirname, '..', 'uploads', 'auctions', currentImage.filename);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted removed image: ${currentImage.filename}`);
            }
            // Delete from database
            await AuctionImage.findByIdAndDelete(currentImage._id);
          }
        }
        
        // Add new images and update existing ones
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const existingImage = await AuctionImage.findOne({ 
            auctionId: id, 
            filename: image.filename 
          });
          
          if (existingImage) {
            // Update existing image order and main status
            existingImage.order = i;
            existingImage.isMain = i === 0;
            await existingImage.save();
          } else {
            // Create new image record
            const newImage = new AuctionImage({
              auctionId: id,
              url: image.url,
              filename: image.filename,
              originalName: image.originalName,
              size: image.size,
              order: i,
              isMain: i === 0
            });
            await newImage.save();
          }
        }
        
        console.log(`Updated images for auction ${id}`);
      } catch (error) {
        console.error('Error updating images:', error);
        // Continue with auction update even if image update fails
      }
    }

    const updatedAuction = await Auction.findByIdAndUpdate(id, updateData, { new: true })
      .populate('sellerId', 'firstName lastName username')
      .populate('categoryId');

    // Get updated images
    const updatedImages = await AuctionImage.find({ auctionId: id }).sort({ order: 1 });

    res.json({
      success: true,
      message: 'Auction updated successfully',
      data: { 
        auction: {
          ...updatedAuction.toObject(),
          id: updatedAuction._id.toString(),
          seller: updatedAuction.sellerId,
          category: updatedAuction.categoryId,
          images: updatedImages
        }
      }
    });

  } catch (error) {
    console.error('Update auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update auction'
    });
  }
};

// Delete auction
const deleteAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (auction.sellerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this auction'
      });
    }

    // Check if auction can be deleted
    if (auction.status === 'ACTIVE') {
      const bidCount = await Bid.countDocuments({ auctionId: id });
      if (bidCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete auction with existing bids'
      });
    }
    }

    // Clean up images before deleting auction
    try {
      const images = await AuctionImage.find({ auctionId: id });
      const fs = require('fs');
      const path = require('path');
      
      for (const image of images) {
        // Delete image file from filesystem
        const imagePath = path.join(__dirname, '..', 'uploads', 'auctions', image.filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Deleted image file: ${image.filename}`);
        }
      }
      
      // Delete image records from database
      await AuctionImage.deleteMany({ auctionId: id });
      console.log(`Deleted ${images.length} image records for auction ${id}`);
    } catch (error) {
      console.error('Error cleaning up images:', error);
      // Continue with auction deletion even if image cleanup fails
    }

    // Delete related records
    await Promise.all([
      Bid.deleteMany({ auctionId: id }),
      Watchlist.deleteMany({ auctionId: id })
    ]);

    // Delete auction
    await Auction.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Auction and associated data deleted successfully'
    });

  } catch (error) {
    console.error('Delete auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete auction'
    });
  }
};

// Get user's auctions
const getUserAuctions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { sellerId: userId };
    if (status) {
      filter.status = status.toUpperCase();
    }

    const auctions = await Auction.find(filter)
      .populate('categoryId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Auction.countDocuments(filter);

    // Get additional data for each auction
    const auctionsWithCounts = await Promise.all(
      auctions.map(async (auction) => {
        const [bidCount, watchlistCount] = await Promise.all([
          Bid.countDocuments({ auctionId: auction._id }),
          Watchlist.countDocuments({ auctionId: auction._id })
        ]);

        return {
          ...auction.toObject(),
          id: auction._id.toString(),
          category: auction.categoryId,
        _count: {
            bids: bidCount,
            watchlist: watchlistCount
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        auctions: auctionsWithCounts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount
        }
      }
    });

  } catch (error) {
    console.error('Get user auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user auctions'
    });
  }
};

// Place bid on auction
const placeBid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = req.user.id;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Validation checks
    if (auction.sellerId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot bid on your own auction'
      });
    }

    if (auction.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Auction is not active'
      });
    }

    if (new Date() > new Date(auction.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Auction has ended'
      });
    }

    const bidAmount = parseFloat(amount);
    const minBidAmount = auction.currentBid > 0 ? 
      auction.currentBid + auction.bidIncrement : 
      auction.basePrice;

    if (bidAmount < minBidAmount) {
      return res.status(400).json({
        success: false,
        message: `Bid must be at least $${minBidAmount}`
      });
    }

    // Get previous highest bid for outbid notification
    const previousHighestBid = await Bid.findOne({ auctionId: id })
      .sort({ amount: -1 })
      .populate('bidderId');

    // Check if user has already bid on this auction
    const existingBid = await Bid.findOne({ 
      auctionId: id, 
      bidderId: userId 
    });

    let bid;
    let isUpdate = false;
    let previousAmount = null;

    if (existingBid) {
      // Update existing bid if new amount is higher
      if (bidAmount <= existingBid.amount) {
      return res.status(400).json({
        success: false,
          message: `Your new bid must be higher than your current bid of $${existingBid.amount}`
        });
      }

      // Store previous amount before updating
      previousAmount = existingBid.amount;
      
      // Update the existing bid
      existingBid.amount = bidAmount;
      existingBid.createdAt = new Date(); // Update timestamp for bid history order
      await existingBid.save();
      bid = existingBid;
      isUpdate = true;

      console.log(`🔄 User ${userId} updated bid on auction ${id} from $${previousAmount} to $${bidAmount}`);
    } else {
      // Create new bid
      bid = new Bid({
        amount: bidAmount,
        bidderId: userId,
          auctionId: id,
        isWinning: false // Will be updated below
      });

      await bid.save();
      console.log(`✨ User ${userId} placed new bid of $${bidAmount} on auction ${id}`);
    }

    // Mark all bids as not winning first
    await Bid.updateMany(
      { auctionId: id },
      { isWinning: false }
    );

    // Mark the highest bid as winning
    const highestBid = await Bid.findOne({ auctionId: id })
      .sort({ amount: -1 });
    
    if (highestBid) {
      highestBid.isWinning = true;
      await highestBid.save();
    }

    // Update auction with new current bid and increment bid count for new bids only
    const updateData = { currentBid: bidAmount };
    if (!isUpdate) {
      updateData.$inc = { bidCount: 1 };
    }

    await Auction.findByIdAndUpdate(id, updateData);

    // Send outbid notification to previous highest bidder
    // Only send if there was a previous highest bid and it's from a different user
    if (previousHighestBid && 
        previousHighestBid.bidderId && 
        previousHighestBid.bidderId._id.toString() !== userId) {
      
      try {
        console.log(`📢 Sending outbid notification - Previous winner: ${previousHighestBid.bidderId.username} ($${previousHighestBid.amount}) -> New winner: User ${userId} ($${bidAmount})`);
        
        // Populate the bid with user data for the new bid
        const newBidWithUser = await Bid.findById(bid._id).populate('bidderId');
        
        // Send outbid notification
        await AuctionService.handleOutbidNotification(
          auction,
          newBidWithUser,
          previousHighestBid
        );
      } catch (notificationError) {
        console.error('❌ Error sending outbid notification:', notificationError);
        // Don't fail the bid placement if notification fails
      }
    } else {
      console.log(`📢 No outbid notification needed - Previous bid: ${previousHighestBid ? `${previousHighestBid.bidderId?.username || 'Unknown'} ($${previousHighestBid.amount})` : 'None'}, Current user: ${userId}`);
    }

    // Populate the bid with user data
    const populatedBid = await Bid.findById(bid._id)
      .populate('bidderId', 'firstName lastName username profilePhoto');

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate ? 'Bid updated successfully' : 'Bid placed successfully',
      data: {
        bid: {
          ...populatedBid.toObject(),
          id: populatedBid._id.toString(),
          bidder: populatedBid.bidderId
        },
        isUpdate,
        previousAmount: isUpdate ? previousAmount : null
      }
    });

  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place bid'
    });
  }
};

// Get auction bids
const getAuctionBids = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bids = await Bid.find({ auctionId: id })
      .populate('bidderId', 'firstName lastName username profilePhoto')
      .sort({ amount: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Bid.countDocuments({ auctionId: id });

    const formattedBids = bids.map(bid => ({
      ...bid.toObject(),
      id: bid._id.toString(),
      bidder: bid.bidderId
    }));

    res.json({
      success: true,
      data: {
        bids: formattedBids,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount
        }
      }
    });

  } catch (error) {
    console.error('Get auction bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auction bids'
    });
  }
};

// Toggle watchlist
const toggleWatchlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    const existingWatchlist = await Watchlist.findOne({
      userId,
          auctionId: id
    });

    if (existingWatchlist) {
      // Remove from watchlist
      await Watchlist.findByIdAndDelete(existingWatchlist._id);

      res.json({
        success: true,
        message: 'Removed from watchlist',
        data: { isWatched: false }
      });
    } else {
      // Add to watchlist
      const watchlist = new Watchlist({
        userId,
          auctionId: id
      });

      await watchlist.save();

      res.json({
        success: true,
        message: 'Added to watchlist',
        data: { isWatched: true }
      });
    }

  } catch (error) {
    console.error('Toggle watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle watchlist'
    });
  }
};

// Get user's bid status for an auction
const getUserBidStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Find user's bid on this auction
    const userBid = await Bid.findOne({ 
      auctionId: id, 
      bidderId: userId 
    }).populate('bidderId', 'firstName lastName username profilePhoto');

    const hasUserBid = !!userBid;
    const isWinning = hasUserBid && userBid.isWinning;
    const minBidAmount = auction.currentBid > 0 ? 
      auction.currentBid + auction.bidIncrement : 
      auction.basePrice;

    res.json({
      success: true,
      data: {
        auctionId: id,
        hasUserBid,
        userBid: hasUserBid ? {
          id: userBid._id.toString(),
          amount: userBid.amount,
          isWinning,
          createdAt: userBid.createdAt,
          bidder: userBid.bidderId
        } : null,
        minBidAmount,
        canBid: auction.status === 'ACTIVE' && new Date() < new Date(auction.endTime),
        auctionStatus: auction.status,
        currentHighestBid: auction.currentBid || auction.basePrice
      }
    });

  } catch (error) {
    console.error('Get user bid status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bid status'
    });
  }
};

// Get watchlist status for an auction
const getWatchlistStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    const watchlistItem = await Watchlist.findOne({
      userId,
      auctionId: id
    });

    const isWatched = !!watchlistItem;

    res.json({
      success: true,
      data: {
        auctionId: id,
        isWatched,
        watchlistId: isWatched ? watchlistItem._id.toString() : null,
        addedAt: isWatched ? watchlistItem.createdAt : null
      }
    });

  } catch (error) {
    console.error('Get watchlist status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get watchlist status'
    });
  }
};

module.exports = {
  createAuction,
  getAuctions,
  getAuctionById,
  updateAuction,
  deleteAuction,
  getUserAuctions,
  placeBid,
  getAuctionBids,
  getUserBidStatus,
  toggleWatchlist,
  getWatchlistStatus
}; 