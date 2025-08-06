const User = require('../models/User');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Watchlist = require('../models/Watchlist');
const ProductSubmission = require('../models/ProductSubmission');
const Payment = require('../models/Payment');
const notificationService = require('../services/notificationService');

class AdminController {
  // Dashboard Statistics
  async getDashboardStats(req, res) {
    try {
      const [
        totalProducts,
        activeAuctions,
        totalBids,
        totalUsers,
        totalRevenue,
        lastMonthUsers
      ] = await Promise.all([
        Auction.countDocuments(),
        Auction.countDocuments({ status: 'ACTIVE' }),
        Bid.countDocuments(),
        User.countDocuments(),
        Bid.aggregate([
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        User.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
          }
        })
      ]);

      const stats = {
        totalProducts: totalProducts,
        activeAuctions: activeAuctions,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalBids: totalBids,
        newUsersThisMonth: lastMonthUsers,
        revenueGrowth: 16 // This would need historical data calculation
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  }

  // Revenue Data for Charts
  async getRevenueData(req, res) {
    try {
      const { period = '6months' } = req.query;
      const monthsBack = period === '6months' ? 6 : 12;
      
      const revenueData = [];
      const labels = [];
      
      for (let i = monthsBack - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthRevenue = await Bid.aggregate([
          {
            $match: {
              createdAt: {
                $gte: monthStart,
                $lte: monthEnd
              }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ]);
        
        labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
        revenueData.push(monthRevenue[0]?.total || 0);
      }

      res.json({
        success: true,
        data: {
          labels,
          data: revenueData
        }
      });
    } catch (error) {
      console.error('Revenue data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue data'
      });
    }
  }

  // Category Statistics
  async getCategoryStats(req, res) {
    try {
      const categories = await Category.find({ isActive: true });
      
      const categoryStats = await Promise.all(
        categories.map(async (category) => {
          const auctionCount = await Auction.countDocuments({ categoryId: category._id });
          return {
            name: category.name,
            count: auctionCount
          };
        })
      );

      const labels = categoryStats.map(cat => cat.name);
      const data = categoryStats.map(cat => cat.count);

      res.json({
        success: true,
        data: {
          labels,
          data
        }
      });
    } catch (error) {
      console.error('Category stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category statistics'
      });
    }
  }

  // Recent Activity
  async getRecentActivity(req, res) {
    try {
      // Get recent auctions, bids, and users
      const [recentAuctions, recentBids, recentUsers] = await Promise.all([
        Auction.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('sellerId', 'firstName lastName'),
        Bid.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('bidderId', 'firstName lastName')
          .populate('auctionId', 'title'),
        User.find()
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

      const activities = [];

      // Add auction activities
      recentAuctions.forEach(auction => {
        const seller = auction.sellerId;
        activities.push({
          id: `auction-${auction._id}`,
          type: 'product_added',
          title: 'New auction created',
          description: `${seller?.firstName || 'Unknown'} ${seller?.lastName || 'User'} created "${auction.title}"`,
          timestamp: auction.createdAt,
          icon: 'fas fa-plus',
          iconBg: 'bg-green-500'
        });
      });

      // Add bid activities
      recentBids.forEach(bid => {
        const auction = bid.auctionId;
        activities.push({
          id: `bid-${bid._id}`,
          type: 'bid_placed',
          title: 'New bid placed',
          description: `$${bid.amount} bid on "${auction?.title || 'Unknown Auction'}"`,
          timestamp: bid.createdAt,
          icon: 'fas fa-gavel',
          iconBg: 'bg-blue-500'
        });
      });

      // Add user activities
      recentUsers.forEach(user => {
        activities.push({
          id: `user-${user._id}`,
          type: 'user_registered',
          title: 'New user registered',
          description: `${user.firstName} ${user.lastName} joined the platform`,
          timestamp: user.createdAt,
          icon: 'fas fa-user-plus',
          iconBg: 'bg-purple-500'
        });
      });

      // Sort by timestamp and take top 10
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json({
        success: true,
        data: activities.slice(0, 10)
      });
    } catch (error) {
      console.error('Recent activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent activity'
      });
    }
  }

  // Get auctions ending soon
  async getEndingSoonAuctions(req, res) {
    try {
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const endingSoonAuctions = await Auction.find({
        status: 'ACTIVE',
        endTime: {
          $gte: now,
          $lte: twentyFourHoursFromNow
        }
      })
      .sort({ endTime: 1 })
      .limit(10)
      .populate('sellerId', 'firstName lastName email')
      .populate('categoryId', 'name');

      const formattedAuctions = endingSoonAuctions.map(auction => ({
        id: auction._id.toString(),
        title: auction.title,
        currentBid: auction.currentBid,
        endTime: auction.endTime,
        seller: auction.sellerId,
        category: auction.categoryId,
        bidCount: auction.bidCount,
        viewCount: auction.viewCount
      }));

      res.json({
        success: true,
        data: formattedAuctions
      });
    } catch (error) {
      console.error('Ending soon auctions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ending soon auctions'
      });
    }
  }

  // Get all users with pagination and search
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const role = req.query.role || '';
      const status = req.query.status || '';

      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      
      // Always exclude ADMIN users for cleaner admin panel
      filter.role = { $ne: 'ADMIN' };
      
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role && role !== 'ADMIN') {
        filter.role = role;
      }
      
      if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshToken -emailVerificationToken -passwordResetToken')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      const formattedUsers = users.map(user => ({
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }));

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          total: total,
          page: page,
          totalPages: Math.ceil(total / limit),
          limit: limit
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }

  // Update user status (activate/deactivate)
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      ).select('-password -refreshToken');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { 
          user: {
            ...user.toObject(),
            id: user._id.toString()
          }
        }
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status'
      });
    }
  }

  // Update user profile (full update)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role, isActive } = req.body;

      // Check if user exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== existingUser.email) {
        const emailExists = await User.findOne({ email, _id: { $ne: id } });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Prepare update data
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;

      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).select('-password -refreshToken -emailVerificationToken -passwordResetToken');

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { 
          user: {
            ...user.toObject(),
            id: user._id.toString()
          }
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Always perform cascade delete for all user related data
      console.log(`Performing cascade delete for user ${id}`);
      
      // Delete user's bids
      const deletedBids = await Bid.deleteMany({ bidderId: id });
      console.log(`Deleted ${deletedBids.deletedCount} bids`);
      
      // Delete user's auctions
      const userAuctions = await Auction.find({ sellerId: id });
      const auctionIds = userAuctions.map(auction => auction._id);
      
      // Delete bids on user's auctions
      if (auctionIds.length > 0) {
        const deletedAuctionBids = await Bid.deleteMany({ auctionId: { $in: auctionIds } });
        console.log(`Deleted ${deletedAuctionBids.deletedCount} bids on user's auctions`);
      }
      
      // Delete auctions
      const deletedAuctions = await Auction.deleteMany({ sellerId: id });
      console.log(`Deleted ${deletedAuctions.deletedCount} auctions`);
      
      // Delete user's watchlist entries
      const deletedWatchlist = await Watchlist.deleteMany({ userId: id });
      console.log(`Deleted ${deletedWatchlist.deletedCount} watchlist entries`);
      
      // Delete user's notifications
      const deletedNotifications = await Notification.deleteMany({ userId: id });
      console.log(`Deleted ${deletedNotifications.deletedCount} notifications`);
      
      // Delete user's product submissions
      const deletedSubmissions = await ProductSubmission.deleteMany({ sellerId: id });
      console.log(`Deleted ${deletedSubmissions.deletedCount} product submissions`);
      
      // Delete user's payment records
      const deletedPayments = await Payment.deleteMany({ userId: id });
      console.log(`Deleted ${deletedPayments.deletedCount} payment records`);

      // Finally delete the user
      await User.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'User and all related data deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }

  // Get all bids with pagination and search
  async getBids(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const auctionId = req.query.auctionId || '';

      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (auctionId) {
        filter.auctionId = auctionId;
      }

      const [bids, total] = await Promise.all([
        Bid.find(filter)
          .populate('bidderId', 'firstName lastName email')
          .populate('auctionId', 'title')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Bid.countDocuments(filter)
      ]);

      const formattedBids = bids.map(bid => ({
        id: bid._id.toString(),
        amount: bid.amount,
        isWinning: bid.isWinning,
        createdAt: bid.createdAt,
        bidder: bid.bidderId,
        auction: bid.auctionId
      }));

      res.json({
        success: true,
        data: {
          bids: formattedBids,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get bids error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bids'
      });
    }
  }

  // Delete bid
  async deleteBid(req, res) {
    try {
      const { id } = req.params;

      const bid = await Bid.findByIdAndDelete(id);

      if (!bid) {
        return res.status(404).json({
          success: false,
          message: 'Bid not found'
        });
      }

      res.json({
        success: true,
        message: 'Bid deleted successfully'
      });
    } catch (error) {
      console.error('Delete bid error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete bid'
      });
    }
  }

  // Send notification to users
  async sendNotification(req, res) {
    try {
      const { title, message, type = 'GENERAL', targetUsers = 'all', userEmails } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required'
        });
      }

      let users = [];

      if (targetUsers === 'specific' && userEmails && Array.isArray(userEmails)) {
        // Send to specific users by email
        users = await User.find({ 
          email: { $in: userEmails },
          isActive: true 
        }).select('_id email');

        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No active users found with the provided email addresses'
          });
        }
      } else {
        // Send to all active users
        users = await User.find({ isActive: true }).select('_id email');
      }

      // Use notification service to create and send notifications
      const notificationPromises = users.map(user => 
        notificationService.createNotification({
          userId: user._id,
          title,
          message,
          type,
          sendPush: true,
          sendWebSocket: true
        })
      );

      await Promise.all(notificationPromises);

      res.json({
        success: true,
        message: `Notification sent to ${users.length} user${users.length !== 1 ? 's' : ''}`,
        data: {
          sentTo: users.length,
          targetUsers,
          userEmails: targetUsers === 'specific' ? users.map(u => u.email) : undefined
        }
      });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification'
      });
    }
  }

  // Get system notifications
  async getSystemNotifications(req, res) {
    try {
      const notifications = await Notification.find({ type: 'SYSTEM' })
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({
        success: true,
        data: { notifications }
      });
    } catch (error) {
      console.error('System notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system notifications'
      });
    }
  }

  // Toggle Auction Featured Status (Admin Only)
  async toggleAuctionFeatured(req, res) {
    try {
      const { id } = req.params;
      const { isFeatured } = req.body;

      const auction = await Auction.findById(id);
      if (!auction) {
        return res.status(404).json({
          success: false,
          message: 'Auction not found'
        });
      }

      // Update featured status
      auction.isFeatured = Boolean(isFeatured);
      await auction.save();

      // Log admin action
      console.log(`Admin ${req.user.id} ${isFeatured ? 'featured' : 'unfeatured'} auction ${id}`);

      res.json({
        success: true,
        message: `Auction ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
        data: { 
          auction: {
            ...auction.toObject(),
            id: auction._id.toString()
          }
        }
      });
    } catch (error) {
      console.error('Toggle featured error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update featured status'
      });
    }
  }

  // Bulk Update Auctions Featured Status (Admin Only)
  async bulkUpdateFeatured(req, res) {
    try {
      const { auctionIds, isFeatured } = req.body;

      if (!Array.isArray(auctionIds) || auctionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid auction IDs array is required'
        });
      }

      // Update multiple auctions
      const result = await Auction.updateMany(
        { _id: { $in: auctionIds } },
        { isFeatured: Boolean(isFeatured) }
      );

      // Log admin action
      console.log(`Admin ${req.user.id} bulk ${isFeatured ? 'featured' : 'unfeatured'} ${result.modifiedCount} auctions`);

      res.json({
        success: true,
        message: `${result.modifiedCount} auctions ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
        data: { 
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        }
      });
    } catch (error) {
      console.error('Bulk update featured error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update featured status'
      });
    }
  }
}

module.exports = new AdminController(); 