const cron = require('node-cron');
const AuctionService = require('../services/auctionService');

class AuctionScheduler {
  
  static init() {
    console.log('🕐 Initializing auction scheduler...');
    
    // Run every minute to check for expired auctions
    cron.schedule('* * * * *', async () => {
      try {
        await AuctionService.scheduleAuctionUpdates();
      } catch (error) {
        console.error('❌ Scheduled auction update failed:', error);
      }
    });
    
    console.log('✅ Auction scheduler initialized - checking every minute for expired auctions');
  }
  
  static async runManualCheck() {
    try {
      console.log('🔄 Running manual auction check...');
      const processedCount = await AuctionService.processExpiredAuctions();
      console.log(`✅ Manual check completed. Processed ${processedCount} auctions.`);
      return processedCount;
    } catch (error) {
      console.error('❌ Manual auction check failed:', error);
      throw error;
    }
  }
}

module.exports = AuctionScheduler; 