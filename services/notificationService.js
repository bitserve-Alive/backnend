const Notification = require('../models/Notification');
const User = require('../models/User');
const { Expo } = require('expo-server-sdk');
const WebSocket = require('ws');

class NotificationService {
  constructor() {
    this.expo = new Expo();
    this.wsServer = null;
    this.connectedClients = new Map(); // userId -> WebSocket connection
  }

  // Initialize WebSocket server
  initializeWebSocket(server) {
    this.wsServer = new WebSocket.Server({ 
      server,
      verifyClient: (info) => {
        console.log('🔍 WebSocket connection attempt from:', info.origin);
        return true;
      }
    });

    this.wsServer.on('connection', (ws, req) => {
      // Extract user ID from token
      const token = this.extractTokenFromRequest(req);
      const userId = this.getUserIdFromToken(token);
      
      if (userId) {
        // Ensure userId is stored as string for consistent lookup
        const userIdString = userId.toString();
        this.connectedClients.set(userIdString, ws);
        
        // Send initial unread count
        this.sendUnreadCount(userIdString);
        
        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connection_confirmed',
          message: 'WebSocket connection established'
        }));
        
        ws.on('close', () => {
          this.connectedClients.delete(userIdString);
        });
      } else {
        ws.close(1008, 'Invalid token');
        return;
      }

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      // Keep connection alive
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.isAlive = true;
    });

    // Ping clients periodically to keep connections alive
    const interval = setInterval(() => {
      this.wsServer.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wsServer.on('close', () => {
      clearInterval(interval);
    });
  }

  extractTokenFromRequest(req) {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get('token');
  }

  getUserIdFromToken(token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.userId;
    } catch (error) {
      return null;
    }
  }

  // Create and send notification
  async createNotification(data) {
    try {
      const { 
        userId, 
        title, 
        message, 
        type = 'GENERAL', 
        auctionId = null,
        sendPush = true,
        sendWebSocket = true 
      } = data;

      // Create notification in database
      const notification = new Notification({
        userId,
        title,
        message,
        type,
        auctionId,
        isRead: false
      });

      await notification.save();

      // Populate auction data if exists
      if (auctionId) {
        await notification.populate('auction', 'title images');
      }

      // Send real-time notification via WebSocket
      if (sendWebSocket) {
        this.sendWebSocketNotification(userId, notification);
      }

      // Send push notification
      if (sendPush) {
        await this.sendPushNotification(userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // Send real-time notification via WebSocket
  sendWebSocketNotification(userId, notification) {
    // Ensure userId is string for consistent lookup
    const userIdString = userId.toString();
    
    const ws = this.connectedClients.get(userIdString);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type: 'notification',
          notification: {
            id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
            auction: notification.auction
          }
        };
        
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Error sending WebSocket notification:', error);
      }
    }
  }

  // Send push notification to mobile devices
  async sendPushNotification(userId, notification) {
    try {
      // Get user's push tokens
      const user = await User.findById(userId);
      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        return;
      }

      const messages = [];
      
      for (const pushToken of user.pushTokens) {
        // Check if token is valid Expo push token
        if (!Expo.isExpoPushToken(pushToken)) {
          continue;
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification._id.toString(),
            type: notification.type,
            auctionId: notification.auctionId?.toString() || null,
          },
          badge: await this.getUnreadCount(userId),
        });
      }

      if (messages.length === 0) {
        return;
      }

      // Send push notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('❌ Error sending push notification chunk:', error);
        }
      }
      
      // Handle tickets for error tracking
      this.handlePushNotificationTickets(tickets, userId);

    } catch (error) {
      console.error('❌ Error sending push notification:', error);
    }
  }

  // Handle push notification delivery receipts
  async handlePushNotificationTickets(tickets, userId) {
    const receiptIds = [];
    
    for (const ticket of tickets) {
      if (ticket.id) {
        receiptIds.push(ticket.id);
      } else if (ticket.status === 'error') {
        // Remove invalid tokens
        if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          await this.removeInvalidPushToken(userId, ticket.details.expoPushToken);
        }
      }
    }
  }

  // Remove invalid push token from user
  async removeInvalidPushToken(userId, invalidToken) {
    try {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushTokens: invalidToken }
      });
    } catch (error) {
      console.error('❌ Error removing invalid push token:', error);
    }
  }

  // Send unread count via WebSocket
  async sendUnreadCount(userId) {
    const userIdString = userId.toString();
    const ws = this.connectedClients.get(userIdString);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const unreadCount = await this.getUnreadCount(userIdString);
        ws.send(JSON.stringify({
          type: 'unread_count',
          count: unreadCount
        }));
      } catch (error) {
        console.error('❌ Error sending unread count:', error);
      }
    }
  }

  // Broadcast notification read status
  broadcastNotificationRead(userId, notificationId) {
    const userIdString = userId.toString();
    const ws = this.connectedClients.get(userIdString);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'notification_read',
          notificationId
        }));
      } catch (error) {
        console.error('❌ Error broadcasting notification read:', error);
      }
    }
  }

  // Get unread notification count
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ 
        userId, 
        isRead: false 
      });
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  // Bulk notification methods for common scenarios
  async notifyBidPlaced(auctionId, bidderId, bidAmount, auctionTitle, sellerId) {
    // Notify auction seller
    await this.createNotification({
      userId: sellerId,
      title: 'New Bid Placed!',
      message: `Someone placed a bid of Rs. ${bidAmount} on your auction "${auctionTitle}"`,
      type: 'BID_PLACED',
      auctionId
    });
  }

  async notifyBidOutbid(previousBidderId, auctionId, newBidAmount, auctionTitle) {
    await this.createNotification({
      userId: previousBidderId,
      title: 'You\'ve been outbid!',
      message: `Your bid on "${auctionTitle}" has been outbid with Rs. ${newBidAmount}`,
      type: 'BID_OUTBID',
      auctionId
    });
  }

  async notifyAuctionWon(winnerId, auctionId, winningBid, auctionTitle) {
    await this.createNotification({
      userId: winnerId,
      title: 'Congratulations! You won!',
      message: `You won the auction "${auctionTitle}" with your bid of Rs. ${winningBid}`,
      type: 'AUCTION_WON',
      auctionId
    });
  }

  async notifyAuctionEnded(sellerId, auctionId, auctionTitle, finalBid = null) {
    const message = finalBid 
      ? `Your auction "${auctionTitle}" has ended with a winning bid of Rs. ${finalBid}`
      : `Your auction "${auctionTitle}" has ended with no bids`;

    await this.createNotification({
      userId: sellerId,
      title: 'Auction Ended',
      message,
      type: 'AUCTION_ENDED',
      auctionId
    });
  }

  async notifyAuctionStarting(watcherIds, auctionId, auctionTitle) {
    const notifications = watcherIds.map(userId => ({
      userId,
      title: 'Auction Starting Soon!',
      message: `The auction "${auctionTitle}" you're watching is starting soon`,
      type: 'AUCTION_STARTING',
      auctionId
    }));

    // Create all notifications
    for (const notificationData of notifications) {
      await this.createNotification(notificationData);
    }
  }

  // Register push token for user
  async registerPushToken(userId, pushToken) {
    try {
      // Validate push token
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Invalid push token format');
      }

      // Add token to user's pushTokens array (avoid duplicates)
      await User.findByIdAndUpdate(userId, {
        $addToSet: { pushTokens: pushToken }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      throw error;
    }
  }

  // Cleanup method
  cleanup() {
    if (this.wsServer) {
      this.wsServer.close();
    }
    this.connectedClients.clear();
  }
}

module.exports = new NotificationService(); 