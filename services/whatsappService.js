const axios = require('axios');
const crypto = require('crypto');
const Settings = require('../models/Settings');

class WhatsAppService {
  constructor() {
    // Initialize with default values
    this.phoneNumberId = null;
    this.accessToken = null;
    this.verifyToken = null;
    this.businessAccountId = null;
    this.webhookSecret = null;
    this.adminPhoneNumbers = [];
    this.enabled = false;
    
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.isConfigured = false;
    
    // Load configuration from database
    this.loadConfiguration();
  }

  async loadConfiguration() {
    try {
      const settings = await Settings.findOne();
      
      if (settings && settings.whatsappSettings) {
        const whatsapp = settings.whatsappSettings;
        
        // Use database settings if available, fallback to environment variables
        this.enabled = whatsapp.enabled;
        this.phoneNumberId = whatsapp.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = whatsapp.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
        this.verifyToken = whatsapp.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN;
        this.businessAccountId = whatsapp.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
        this.webhookSecret = whatsapp.webhookSecret || process.env.WHATSAPP_WEBHOOK_SECRET;
        this.adminPhoneNumbers = whatsapp.adminPhoneNumbers.length > 0 
          ? whatsapp.adminPhoneNumbers 
          : [
              process.env.ADMIN_PHONE_1 || '923001234567',
              process.env.ADMIN_PHONE_2 || '923007654321'
            ].filter(phone => phone);
        
        this.notificationSettings = whatsapp.notifications || {
          productSubmissions: true,
          statusUpdates: true,
          bidNotifications: false,
          auctionEndNotifications: false
        };
      } else {
        // Fallback to environment variables
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
        this.webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
        this.adminPhoneNumbers = [
          process.env.ADMIN_PHONE_1 || '923001234567',
          process.env.ADMIN_PHONE_2 || '923007654321'
        ].filter(phone => phone);
        this.enabled = false; // Default to disabled if no settings
      }
      
      // Validate configuration
      this.isConfigured = this.validateConfiguration();
      
      if (!this.isConfigured) {
        console.warn('⚠️ WhatsApp Service: Configuration incomplete. Messages will be logged instead of sent.');
      } else if (!this.enabled) {
        console.log('⚠️ WhatsApp Service: Service is disabled in settings.');
      } else {
        console.log('✅ WhatsApp Service: Initialized successfully');
      }
      
    } catch (error) {
      console.error('❌ WhatsApp Service: Failed to load configuration from database:', error);
      
      // Fallback to environment variables
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      this.webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
      this.adminPhoneNumbers = [
        process.env.ADMIN_PHONE_1 || '923001234567',
        process.env.ADMIN_PHONE_2 || '923007654321'
      ].filter(phone => phone);
      this.enabled = false;
      
      this.isConfigured = this.validateConfiguration();
    }
  }

  validateConfiguration() {
    if (!this.enabled) {
      return false;
    }
    
    return !!(this.phoneNumberId && this.accessToken && this.verifyToken);
  }

  /**
   * Reload configuration from database
   */
  async reloadConfiguration() {
    await this.loadConfiguration();
    return this.getStatus();
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Phone number in international format (without +)
   * @param {string} message - Message text
   * @param {string} type - Message type (text, template, etc.)
   */
  async sendMessage(to, message, type = 'text') {
    if (!this.enabled) {
      console.log('📱 WhatsApp Service (DISABLED): Service is disabled in settings');
      return { success: true, messageId: 'disabled_' + Date.now(), disabled: true };
    }
    
    if (!this.isConfigured) {
      console.log('📱 WhatsApp Service (DEMO MODE): Would send message to', to, ':', message);
      return { success: true, messageId: 'demo_' + Date.now(), demo: true };
    }

    try {
      const url = `${this.baseURL}/${this.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: type,
        text: {
          body: message
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ WhatsApp message sent successfully:', response.data);
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        whatsappId: response.data.messages[0].wamid
      };
      
    } catch (error) {
      console.error('❌ WhatsApp Service Error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        fallback: true
      };
    }
  }

  /**
   * Send product submission notification to admins
   * @param {Object} submission - Product submission data
   */
  async notifyProductSubmission(submission) {
    if (!this.enabled || !this.notificationSettings.productSubmissions) {
      console.log('📱 WhatsApp Service: Product submission notifications are disabled');
      return [];
    }
    
    const message = this.formatProductSubmissionMessage(submission);
    const results = [];

    console.log('📱 Sending product submission notifications via WhatsApp...');

    for (const adminPhone of this.adminPhoneNumbers) {
      try {
        const result = await this.sendMessage(adminPhone, message);
        results.push({
          phone: adminPhone,
          ...result
        });
        
        // Add delay between messages to avoid rate limiting
        await this.delay(1000);
        
      } catch (error) {
        console.error(`❌ Failed to send WhatsApp to ${adminPhone}:`, error);
        results.push({
          phone: adminPhone,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Format product submission message for WhatsApp
   * @param {Object} submission - Product submission data
   * @returns {string} Formatted message
   */
  formatProductSubmissionMessage(submission) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return `🆕 *NEW PRODUCT SUBMISSION*

📦 *Product Details:*
• Name: ${submission.productName}
• Brand: ${submission.brand || 'Not specified'}
• Category: ${submission.category}
• Condition: ${submission.condition}
• Expected Price: ${formatCurrency(submission.expectedPrice)}

👤 *Seller Information:*
• Name: ${submission.sellerName}
• Email: ${submission.sellerEmail}
• Phone: ${submission.sellerPhone}
• City: ${submission.city}

📝 *Description:*
${submission.description.length > 100 ? submission.description.substring(0, 100) + '...' : submission.description}

🖼️ *Images:* ${submission.images.length} uploaded

📊 *Submission Details:*
• ID: ${submission._id}
• Status: ${submission.status}
• Submitted: ${formatDate(submission.submittedAt)}

⚡ *Action Required:*
Please review this submission in the admin dashboard.

---
*Pak Auction System*`;
  }

  /**
   * Send status update notification to seller
   * @param {Object} submission - Product submission data
   * @param {string} newStatus - New status
   * @param {string} adminNotes - Admin notes (optional)
   */
  async notifyStatusUpdate(submission, newStatus, adminNotes = '') {
    // Extract phone number from submission (remove any formatting)
    const sellerPhone = submission.sellerPhone.replace(/[-\s]/g, '');
    
    // Ensure it's in international format (add 92 for Pakistan if starts with 03)
    const formattedPhone = sellerPhone.startsWith('03') 
      ? '92' + sellerPhone.substring(1)
      : sellerPhone;

    const message = this.formatStatusUpdateMessage(submission, newStatus, adminNotes);
    
    console.log(`📱 Sending status update to seller: ${formattedPhone}`);
    
    return await this.sendMessage(formattedPhone, message);
  }

  /**
   * Format status update message for seller
   * @param {Object} submission - Product submission data
   * @param {string} newStatus - New status
   * @param {string} adminNotes - Admin notes
   * @returns {string} Formatted message
   */
  formatStatusUpdateMessage(submission, newStatus, adminNotes) {
    const statusMessages = {
      'UNDER_REVIEW': '🔍 Your product is now under review by our team.',
      'APPROVED': '✅ Great news! Your product has been approved and will be listed soon.',
      'REJECTED': '❌ Unfortunately, your product submission has been rejected.',
      'CONVERTED_TO_AUCTION': '🎉 Excellent! Your product has been converted to a live auction.'
    };

    const statusEmoji = {
      'UNDER_REVIEW': '🔍',
      'APPROVED': '✅',
      'REJECTED': '❌',
      'CONVERTED_TO_AUCTION': '🎉'
    };

    return `${statusEmoji[newStatus]} *SUBMISSION UPDATE*

Hello ${submission.sellerName},

Your product submission has been updated:

📦 *Product:* ${submission.productName}
🆔 *Submission ID:* ${submission._id}
📊 *New Status:* ${newStatus.replace('_', ' ')}

${statusMessages[newStatus]}

${adminNotes ? `📝 *Admin Notes:*\n${adminNotes}\n\n` : ''}${newStatus === 'CONVERTED_TO_AUCTION' ? '🔗 You can track your auction in our system.\n\n' : ''}${newStatus === 'REJECTED' ? '💡 You can submit a new product anytime with improvements.\n\n' : ''}Thank you for using Pak Auction!

---
*Need help? Contact our support team.*`;
  }

  /**
   * Send general notification message
   * @param {string} phoneNumber - Phone number to send to
   * @param {string} title - Message title
   * @param {string} content - Message content
   */
  async sendNotification(phoneNumber, title, content) {
    const message = `*${title}*\n\n${content}\n\n---\n*Pak Auction System*`;
    
    return await this.sendMessage(phoneNumber, message);
  }

  /**
   * Verify webhook signature for security
   * @param {string} signature - Webhook signature
   * @param {string} body - Request body
   * @returns {boolean} Is signature valid
   */
  verifyWebhookSignature(signature, body) {
    if (!this.webhookSecret) {
      console.warn('⚠️ WhatsApp webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Handle incoming webhook from WhatsApp
   * @param {Object} webhookData - Webhook payload
   */
  async handleWebhook(webhookData) {
    console.log('📱 WhatsApp webhook received:', JSON.stringify(webhookData, null, 2));
    
    // Handle different webhook events
    if (webhookData.entry) {
      for (const entry of webhookData.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await this.handleMessageEvent(change.value);
            }
          }
        }
      }
    }
  }

  /**
   * Handle incoming message events
   * @param {Object} messageData - Message event data
   */
  async handleMessageEvent(messageData) {
    if (messageData.messages) {
      for (const message of messageData.messages) {
        console.log('📱 Incoming WhatsApp message:', message);
        
        // You can implement auto-responses here
        // For example, respond to specific keywords
        if (message.text && message.text.body.toLowerCase().includes('status')) {
          // Auto-respond with status check instructions
          await this.sendMessage(
            message.from,
            'To check your submission status, please visit our website or contact support with your submission ID.'
          );
        }
      }
    }
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service health status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      enabled: this.enabled,
      phoneNumberId: this.phoneNumberId ? '***' + this.phoneNumberId.slice(-4) : null,
      adminPhones: this.adminPhoneNumbers.length,
      lastCheck: new Date().toISOString(),
      endpoints: {
        webhook: '/api/whatsapp/webhook',
        status: '/api/whatsapp/status',
        test: '/api/whatsapp/test'
      }
    };
  }
}

module.exports = new WhatsAppService(); 