const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { 
  sendAuctionWinnerEmail, 
  sendAuctionEndedSellerEmail, 
  sendOutbidNotificationEmail,
  sendPaymentConfirmationEmail 
} = require('../utils/email');

class AuctionService {
  
  /**
   * Check for expired auctions and process them
   */
  static async processExpiredAuctions() {
    try {
      console.log('🔍 Checking for expired auctions...');
      
      const expiredAuctions = await Auction.find({
        status: 'ACTIVE',
        endTime: { $lte: new Date() }
      }).populate('sellerId categoryId');
      
      console.log(`📊 Found ${expiredAuctions.length} expired auctions`);
      
      for (const auction of expiredAuctions) {
        await this.processAuctionEnding(auction);
      }
      
      return expiredAuctions.length;
    } catch (error) {
      console.error('❌ Error processing expired auctions:', error);
      throw error;
    }
  }
  
  /**
   * Process individual auction ending
   */
  static async processAuctionEnding(auction) {
    try {
      console.log(`🏁 Processing auction ending: ${auction.title} (${auction._id})`);
      
      // Get highest bid to determine winner
      const winningBid = await Bid.findOne({ 
        auctionId: auction._id 
      })
      .populate('bidderId')
      .sort({ amount: -1 });
      
      if (winningBid) {
        // Auction has winner
        await this.processAuctionWithWinner(auction, winningBid);
      } else {
        // Auction ended without bids
        await this.processAuctionWithoutWinner(auction);
      }
      
    } catch (error) {
      console.error(`❌ Error processing auction ending for ${auction._id}:`, error);
      throw error;
    }
  }
  
  /**
   * Process auction that ended with a winner
   */
  static async processAuctionWithWinner(auction, winningBid) {
    try {
      const winner = winningBid.bidderId;
      const seller = auction.sellerId;
      
      console.log(`🏆 Auction won by ${winner.username} with bid $${winningBid.amount}`);
      
      // Update auction status and set winner
      await Auction.findByIdAndUpdate(auction._id, {
        status: 'ENDED',
        winnerId: winner._id
      });
      
      // Mark winning bid
      winningBid.isWinning = true;
      await winningBid.save();
      
      // Create notifications
      await Promise.all([
        // Winner notification
        this.createNotification({
          userId: winner._id,
          auctionId: auction._id,
          type: 'AUCTION_WON',
          title: '🎉 Congratulations! You Won!',
          message: `You won the auction "${auction.title}" with a bid of $${winningBid.amount.toLocaleString()}. Please complete payment within 48 hours.`
        }),
        
        // Seller notification
        this.createNotification({
          userId: seller._id,
          auctionId: auction._id,
          type: 'AUCTION_ENDED',
          title: '🎯 Your Auction Has Ended',
          message: `Your auction "${auction.title}" ended successfully. Winner: ${winner.firstName} ${winner.lastName} with a bid of $${winningBid.amount.toLocaleString()}.`
        })
      ]);
      
      // Send emails
      await Promise.all([
        // Winner email
        sendAuctionWinnerEmail(
          winner.email,
          winner.firstName,
          auction,
          winningBid.amount
        ),
        
        // Seller email
        sendAuctionEndedSellerEmail(
          seller.email,
          seller.firstName,
          auction,
          winner,
          winningBid.amount
        )
      ]);
      
      // Notify other bidders they lost
      await this.notifyLosingBidders(auction._id, winner._id);
      
      console.log(`✅ Successfully processed winning auction: ${auction._id}`);
      
    } catch (error) {
      console.error(`❌ Error processing auction with winner:`, error);
      throw error;
    }
  }
  
  /**
   * Process auction that ended without bids
   */
  static async processAuctionWithoutWinner(auction) {
    try {
      console.log(`📭 Auction ended without bids: ${auction.title}`);
      
      // Update auction status
      await Auction.findByIdAndUpdate(auction._id, {
        status: 'ENDED'
      });
      
      // Notify seller
      await this.createNotification({
        userId: auction.sellerId._id,
        auctionId: auction._id,
        type: 'AUCTION_ENDED',
        title: '📭 Your Auction Ended',
        message: `Your auction "${auction.title}" has ended without any bids. You can create a new auction or adjust your starting price.`
      });
      
      console.log(`✅ Successfully processed auction without winner: ${auction._id}`);
      
    } catch (error) {
      console.error(`❌ Error processing auction without winner:`, error);
      throw error;
    }
  }
  
  /**
   * Notify losing bidders
   */
  static async notifyLosingBidders(auctionId, winnerId) {
    try {
      // Get all losing bidders
      const losingBids = await Bid.find({
        auctionId,
        bidderId: { $ne: winnerId }
      })
      .populate('bidderId auctionId')
      .sort({ amount: -1 });
      
      // Group by user (in case user bid multiple times)
      const uniqueLosers = new Map();
      losingBids.forEach(bid => {
        if (!uniqueLosers.has(bid.bidderId._id.toString())) {
          uniqueLosers.set(bid.bidderId._id.toString(), {
            user: bid.bidderId,
            auction: bid.auctionId,
            highestBid: bid.amount
          });
        }
      });
      
      // Send notifications to losing bidders
      const notifications = Array.from(uniqueLosers.values()).map(async ({ user, auction, highestBid }) => {
        return this.createNotification({
          userId: user._id,
          auctionId: auction._id,
          type: 'AUCTION_ENDED',
          title: '😔 Auction Ended - You Didn\'t Win',
          message: `The auction "${auction.title}" has ended. Unfortunately, your bid of $${highestBid.toLocaleString()} was not the highest. Better luck next time!`
        });
      });
      
      await Promise.all(notifications);
      
      console.log(`📢 Notified ${uniqueLosers.size} losing bidders`);
      
    } catch (error) {
      console.error('❌ Error notifying losing bidders:', error);
    }
  }
  
  /**
   * Handle outbid notifications when a new bid is placed
   */
  static async handleOutbidNotification(auction, newBid, previousHighestBid) {
    try {
      if (!previousHighestBid || !previousHighestBid.bidderId) return;
      
      const outbidUser = await User.findById(previousHighestBid.bidderId);
      if (!outbidUser) return;
      
      console.log(`📢 Sending outbid notification to ${outbidUser.username}`);
      
      // Create notification
      await this.createNotification({
        userId: outbidUser._id,
        auctionId: auction._id,
        type: 'BID_OUTBID',
        title: '⚠️ You\'ve Been Outbid!',
        message: `Someone placed a higher bid of $${newBid.amount.toLocaleString()} on "${auction.title}". Your bid was $${previousHighestBid.amount.toLocaleString()}.`
      });
      
      // Send email
      await sendOutbidNotificationEmail(
        outbidUser.email,
        outbidUser.firstName,
        auction,
        previousHighestBid.amount,
        newBid.amount
      );
      
    } catch (error) {
      console.error('❌ Error sending outbid notification:', error);
    }
  }
  
  /**
   * Handle payment confirmation and notifications
   */
  static async handlePaymentConfirmation(auction, payment) {
    try {
      const user = await User.findById(payment.userId);
      
      if (!user || !auction) {
        console.error('❌ User or auction not found for payment confirmation');
        return;
      }
      
      console.log(`💳 Processing payment confirmation: ${payment.type} - $${payment.amount / 100}`);
      
      // Send payment confirmation email with payment object (includes shipping info)
      await sendPaymentConfirmationEmail(
        user.email,
        user.firstName,
        auction,
        payment
      );
      
      // Create notification
      const isWinningPayment = payment.type === 'WINNING_PAYMENT';
      await this.createNotification({
        userId: user._id,
        auctionId: auction._id,
        type: 'GENERAL',
        title: isWinningPayment ? '✅ Winning Payment Confirmed' : '✅ Entry Fee Payment Confirmed',
        message: isWinningPayment ? 
          `Your payment of $${(payment.amount / 100).toFixed(2)} for winning "${auction.title}" has been confirmed. The seller will ship your item soon.` :
          `Your entry fee payment of $${(payment.amount / 100).toFixed(2)} for "${auction.title}" has been confirmed. You can now place bids.`
      });
      
      // If winning payment, update auction status and notify seller
      if (isWinningPayment) {
        await Auction.findByIdAndUpdate(auction._id, { status: 'SOLD' });
        
        const seller = await User.findById(auction.sellerId);
        if (seller) {
          // Send seller notification with shipping details
          const shippingInfo = payment.shippingInfo;
          const shippingText = shippingInfo ? 
            `\n\nShipping Details:\n${shippingInfo.firstName} ${shippingInfo.lastName}\n${shippingInfo.address.line1}${shippingInfo.address.line2 ? ', ' + shippingInfo.address.line2 : ''}\n${shippingInfo.address.city}, ${shippingInfo.address.state} ${shippingInfo.address.postalCode}\n${shippingInfo.address.country}\nPhone: ${shippingInfo.phone}\nEmail: ${shippingInfo.email}${shippingInfo.deliveryInstructions ? '\nDelivery Instructions: ' + shippingInfo.deliveryInstructions : ''}` : '';
          
          await this.createNotification({
            userId: seller._id,
            auctionId: auction._id,
            type: 'GENERAL',
            title: '💰 Payment Received - Ship Item',
            message: `Payment of $${(payment.amount / 100).toFixed(2)} has been received for "${auction.title}". Please prepare and ship the item within 3 business days.${shippingText}`
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling payment confirmation:', error);
    }
  }
  
  /**
   * Create notification helper
   */
  static async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log(`📬 Created notification: ${notificationData.title} for user ${notificationData.userId}`);
      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }
  
  /**
   * Get user's auction status summary
   */
  static async getUserAuctionSummary(userId) {
    try {
      const [activeSellingCount, activeBiddingCount, wonAuctions, lostAuctions] = await Promise.all([
        // Auctions user is selling that are active
        Auction.countDocuments({ sellerId: userId, status: 'ACTIVE' }),
        
        // Auctions user is bidding on that are active
        Bid.aggregate([
          {
            $lookup: {
              from: 'auctions',
              localField: 'auctionId',
              foreignField: '_id',
              as: 'auction'
            }
          },
          {
            $match: {
              bidderId: userId,
              'auction.status': 'ACTIVE'
            }
          },
          {
            $group: {
              _id: '$auctionId'
            }
          },
          {
            $count: 'total'
          }
        ]).then(result => result[0]?.total || 0),
        
        // Auctions user won
        Auction.countDocuments({ winnerId: userId, status: { $in: ['ENDED', 'SOLD'] } }),
        
        // Auctions user bid on but lost
        Bid.aggregate([
          {
            $lookup: {
              from: 'auctions',
              localField: 'auctionId',
              foreignField: '_id',
              as: 'auction'
            }
          },
          {
            $match: {
              bidderId: userId,
              'auction.status': 'ENDED',
              'auction.winnerId': { $ne: userId }
            }
          },
          {
            $group: {
              _id: '$auctionId'
            }
          },
          {
            $count: 'total'
          }
        ]).then(result => result[0]?.total || 0)
      ]);
      
      return {
        activeSellingCount,
        activeBiddingCount,
        wonAuctions,
        lostAuctions
      };
      
    } catch (error) {
      console.error('❌ Error getting user auction summary:', error);
      throw error;
    }
  }
  
  /**
   * Schedule auction status updates (should be called by cron job)
   */
  static async scheduleAuctionUpdates() {
    try {
      console.log('⏰ Running scheduled auction updates...');
      
      const processedCount = await this.processExpiredAuctions();
      
      console.log(`✅ Scheduled auction update completed. Processed ${processedCount} auctions.`);
      
      return processedCount;
    } catch (error) {
      console.error('❌ Error in scheduled auction updates:', error);
      throw error;
    }
  }
}

module.exports = AuctionService; 