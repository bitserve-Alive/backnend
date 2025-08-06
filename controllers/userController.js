const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Auction = require('../models/Auction');
const Category = require('../models/Category');
const Bid = require('../models/Bid');
const Watchlist = require('../models/Watchlist');
const Notification = require('../models/Notification');
const AuctionImage = require('../models/AuctionImage');
const notificationService = require('../services/notificationService');

// Utility function to safely delete profile photo
const deleteProfilePhoto = (photoPath) => {
  try {
    if (photoPath && typeof photoPath === 'string') {
      const fullPath = path.join(process.cwd(), photoPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('🗑️ Successfully deleted profile photo:', photoPath);
        return true;
      } else {
        console.log('⚠️ Profile photo file not found:', fullPath);
      }
    }
  } catch (error) {
    console.error('❌ Error deleting profile photo:', photoPath, error);
  }
  return false;
};

// Get user dashboard data
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user statistics
    const stats = await Promise.all([
      // Active auctions count
      Auction.countDocuments({
          sellerId: userId,
          status: 'ACTIVE'
      }),
      // Total bids count
      Bid.countDocuments({
        bidderId: userId
      }),
      // Watchlist count
      Watchlist.countDocuments({
        userId
      }),
      // Won auctions count
      Auction.countDocuments({
          winnerId: userId,
          status: 'SOLD'
      })
    ]);

    // Get recent auctions
    const recentAuctions = await Auction.find({ sellerId: userId })
      .populate('categoryId')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get additional data for recent auctions
    const recentAuctionsWithData = await Promise.all(
      recentAuctions.map(async (auction) => {
        const [bidCount, watchlistCount, mainImage] = await Promise.all([
          Bid.countDocuments({ auctionId: auction._id }),
          Watchlist.countDocuments({ auctionId: auction._id }),
          AuctionImage.findOne({ auctionId: auction._id, isMain: true })
        ]);

        return {
          ...auction.toObject(),
          id: auction._id.toString(),
          category: auction.categoryId,
          images: mainImage ? [mainImage] : [],
        _count: {
            bids: bidCount,
            watchlist: watchlistCount
          }
        };
      })
    );

    // Get recent bids
    const recentBids = await Bid.find({ bidderId: userId })
      .populate({
        path: 'auctionId',
        populate: {
          path: 'categoryId'
        }
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get additional data for recent bids
    const recentBidsWithData = await Promise.all(
      recentBids.map(async (bid) => {
        const mainImage = await AuctionImage.findOne({ 
          auctionId: bid.auctionId._id, 
          isMain: true 
        });

        return {
          ...bid.toObject(),
          id: bid._id.toString(),
          auction: {
            ...bid.auctionId.toObject(),
            id: bid.auctionId._id.toString(),
            category: bid.auctionId.categoryId,
            images: mainImage ? [mainImage] : []
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        stats: {
          activeAuctions: stats[0],
          totalBids: stats[1],
          watchlistItems: stats[2],
          wonAuctions: stats[3]
        },
        recentAuctions: recentAuctionsWithData,
        recentBids: recentBidsWithData
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

// Get user's bids
const getUserBids = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter for bids
    const bidFilter = { bidderId: req.user.id };

    // Get bids first
    let bids = await Bid.find(bidFilter)
      .populate('auctionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by auction status if provided
    if (status) {
      bids = bids.filter(bid => bid.auctionId && bid.auctionId.status === status.toUpperCase());
    }

    // Get additional data for each bid
    const bidsWithData = await Promise.all(
      bids.map(async (bid) => {
        if (!bid.auctionId) return null;

        const [category, seller, mainImage] = await Promise.all([
          bid.auctionId.categoryId ? await Category.findById(bid.auctionId.categoryId) : null,
          bid.auctionId.sellerId ? await User.findById(bid.auctionId.sellerId).select('firstName lastName username') : null,
          AuctionImage.findOne({ auctionId: bid.auctionId._id, isMain: true })
        ]);

        return {
          ...bid.toObject(),
          id: bid._id.toString(),
        auction: {
            ...bid.auctionId.toObject(),
            id: bid.auctionId._id.toString(),
            category,
            seller,
            images: mainImage ? [mainImage] : []
              }
        };
      })
    );

    // Filter out null values (deleted auctions)
    const validBids = bidsWithData.filter(bid => bid !== null);

    const totalCount = await Bid.countDocuments(bidFilter);

    res.json({
      success: true,
      data: {
        bids: validBids,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount
        }
      }
    });

  } catch (error) {
    console.error('Get user bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bids'
    });
  }
};

// Get user's watchlist
const getUserWatchlist = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const watchlist = await Watchlist.find({ userId: req.user.id })
      .populate('auctionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get additional data for each watchlist item
    const watchlistWithData = await Promise.all(
      watchlist.map(async (item) => {
        if (!item.auctionId) return null;

        const [category, seller, bidCount, watchlistCount, mainImage] = await Promise.all([
          item.auctionId.categoryId ? await Category.findById(item.auctionId.categoryId) : null,
          item.auctionId.sellerId ? await User.findById(item.auctionId.sellerId).select('firstName lastName username') : null,
          Bid.countDocuments({ auctionId: item.auctionId._id }),
          Watchlist.countDocuments({ auctionId: item.auctionId._id }),
          AuctionImage.findOne({ auctionId: item.auctionId._id, isMain: true })
        ]);

        return {
          ...item.toObject(),
          id: item._id.toString(),
        auction: {
            ...item.auctionId.toObject(),
            id: item.auctionId._id.toString(),
            category,
            seller,
            images: mainImage ? [mainImage] : [],
            _count: {
              bids: bidCount,
              watchlist: watchlistCount
              }
            }
        };
      })
    );

    // Filter out null values (deleted auctions)
    const validWatchlist = watchlistWithData.filter(item => item !== null);

    const totalCount = await Watchlist.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      data: {
        watchlist: validWatchlist,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount
        }
      }
    });

  } catch (error) {
    console.error('Get user watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user watchlist'
    });
  }
};

// Get user's won auctions
const getUserWonAuctions = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find auctions won by the user
    const wonAuctions = await Auction.find({ 
      winnerId: req.user.id, 
      status: { $in: ['ENDED', 'SOLD'] }
    })
      .populate('categoryId')
      .populate('sellerId', 'firstName lastName username')
      .sort({ endTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get additional data for each won auction
    const wonAuctionsWithData = await Promise.all(
      wonAuctions.map(async (auction) => {
        const [bidCount, watchlistCount, mainImage, winningBid] = await Promise.all([
          Bid.countDocuments({ auctionId: auction._id }),
          Watchlist.countDocuments({ auctionId: auction._id }),
          AuctionImage.findOne({ auctionId: auction._id, isMain: true }),
          Bid.findOne({ auctionId: auction._id, bidderId: req.user.id }).sort({ amount: -1 })
        ]);

        return {
          ...auction.toObject(),
          id: auction._id.toString(),
          category: auction.categoryId,
          seller: auction.sellerId,
          images: mainImage ? [mainImage] : [],
          winningBid: winningBid ? winningBid.amount : auction.currentBid,
          _count: {
            bids: bidCount,
            watchlist: watchlistCount
          }
        };
      })
    );

    const totalCount = await Auction.countDocuments({ 
      winnerId: req.user.id, 
      status: { $in: ['ENDED', 'SOLD'] }
    });

    res.json({
      success: true,
      data: {
        wonAuctions: wonAuctionsWithData,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount
        }
      }
    });

  } catch (error) {
    console.error('Get user won auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch won auctions'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, dateOfBirth, marketingEmails, profilePhoto } = req.body;

    // Get current user to check for existing profile photo
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (marketingEmails !== undefined) updateData.marketingEmails = marketingEmails;
    
    // Handle profile photo update with cleanup
    if (profilePhoto !== undefined) {
      // Delete old profile photo if it exists and is different
      if (currentUser.profilePhoto && currentUser.profilePhoto !== profilePhoto) {
        deleteProfilePhoto(currentUser.profilePhoto);
      }
      
      updateData.profilePhoto = profilePhoto;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -refreshToken -emailVerificationToken -passwordResetToken');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { 
        user: {
          ...user.toObject(),
          id: user._id.toString()
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { userId: req.user.id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate('auctionId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      isRead: false 
    });

    const formattedNotifications = notifications.map(notification => ({
      ...notification.toObject(),
      id: notification._id.toString(),
      auction: notification.auctionId
    }));

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Broadcast notification read status via WebSocket
    notificationService.broadcastNotificationRead(userId, id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { 
        notification: {
          ...notification.toObject(),
          id: notification._id.toString()
        }
      }
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    // Send updated unread count via WebSocket
    await notificationService.sendUnreadCount(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

module.exports = {
  getDashboard,
  getUserBids,
  getUserWatchlist,
  getUserWonAuctions,
  updateProfile,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
}; 