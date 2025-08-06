const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const Settings = require('../models/Settings');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Webhook verification (GET request from WhatsApp)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📱 WhatsApp webhook verification request:', { mode, token });

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === whatsappService.verifyToken) {
      console.log('✅ WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ WhatsApp webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    console.warn('❌ WhatsApp webhook verification - missing parameters');
    res.sendStatus(400);
  }
});

// Webhook event handler (POST request from WhatsApp)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.get('X-Hub-Signature-256');
  const body = req.body;

  console.log('📱 WhatsApp webhook event received');

  // Verify webhook signature for security
  if (!whatsappService.verifyWebhookSignature(signature, body)) {
    console.warn('❌ WhatsApp webhook signature verification failed');
    return res.sendStatus(403);
  }

  try {
    const webhookData = JSON.parse(body);
    await whatsappService.handleWebhook(webhookData);
    
    console.log('✅ WhatsApp webhook processed successfully');
    res.sendStatus(200);
    
  } catch (error) {
    console.error('❌ WhatsApp webhook processing error:', error);
    res.sendStatus(500);
  }
});

// Get WhatsApp service status (admin only)
router.get('/status', verifyToken, requireAdmin, (req, res) => {
  try {
    const status = whatsappService.getStatus();
    
    res.json({
      success: true,
      data: {
        service: 'WhatsApp Business API',
        ...status,
        endpoints: {
          webhook: '/api/whatsapp/webhook',
          status: '/api/whatsapp/status',
          test: '/api/whatsapp/test'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp service status'
    });
  }
});

// Test WhatsApp message sending (admin only)
router.post('/test', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    console.log('📱 Testing WhatsApp message to:', phoneNumber);
    
    const result = await whatsappService.sendMessage(phoneNumber, message);
    
    res.json({
      success: true,
      message: 'Test message sent',
      data: result
    });
    
  } catch (error) {
    console.error('❌ WhatsApp test message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test message',
      error: error.message
    });
  }
});

// Send notification to specific phone number (admin only)
router.post('/notify', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, title, content } = req.body;
    
    if (!phoneNumber || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, title, and content are required'
      });
    }

    console.log('📱 Sending WhatsApp notification to:', phoneNumber);
    
    const result = await whatsappService.sendNotification(phoneNumber, title, content);
    
    res.json({
      success: true,
      message: 'Notification sent',
      data: result
    });
    
  } catch (error) {
    console.error('❌ WhatsApp notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

// Get WhatsApp configuration guide (admin only)
router.get('/setup-guide', verifyToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'WhatsApp Business API Setup Guide',
      steps: [
        {
          step: 1,
          title: 'Create Facebook Business Account',
          description: 'Go to business.facebook.com and create a business account'
        },
        {
          step: 2,
          title: 'Set up WhatsApp Business API',
          description: 'In Facebook Business Manager, go to WhatsApp > API Setup'
        },
        {
          step: 3,
          title: 'Get API Credentials',
          description: 'Copy your Phone Number ID, Access Token, and Business Account ID'
        },
        {
          step: 4,
          title: 'Configure Environment Variables',
          description: 'Add the following environment variables to your .env file',
          variables: [
            'WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id',
            'WHATSAPP_ACCESS_TOKEN=your_access_token',
            'WHATSAPP_VERIFY_TOKEN=your_custom_verify_token',
            'WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id',
            'WHATSAPP_WEBHOOK_SECRET=your_webhook_secret',
            'ADMIN_PHONE_1=923001234567',
            'ADMIN_PHONE_2=923007654321'
          ]
        },
        {
          step: 5,
          title: 'Configure Webhook',
          description: 'Set webhook URL in Facebook Developer Console',
          webhookUrl: `${req.protocol}://${req.get('host')}/api/whatsapp/webhook`
        },
        {
          step: 6,
          title: 'Test Integration',
          description: 'Use the test endpoint to verify everything is working'
        }
      ],
      notes: [
        'Phone numbers should be in international format without + (e.g., 923001234567)',
        'WhatsApp Business API requires business verification for production use',
        'Test mode allows messaging to verified numbers only',
        'Webhook must be accessible from the internet (use ngrok for local testing)'
      ]
    }
  });
});

// Get WhatsApp settings (admin only)
router.get('/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const settings = await Settings.findOne();
    
    if (!settings || !settings.whatsappSettings) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          phoneNumberId: '',
          accessToken: '',
          verifyToken: '',
          businessAccountId: '',
          webhookSecret: '',
          adminPhoneNumbers: [],
          notifications: {
            productSubmissions: true,
            statusUpdates: true,
            bidNotifications: false,
            auctionEndNotifications: false
          }
        }
      });
    }

    // Return actual settings for editing (don't mask sensitive data)
    const whatsappSettings = settings.whatsappSettings;
    res.json({
      success: true,
      data: {
        enabled: whatsappSettings.enabled,
        phoneNumberId: whatsappSettings.phoneNumberId,
        accessToken: whatsappSettings.accessToken || '',
        verifyToken: whatsappSettings.verifyToken,
        businessAccountId: whatsappSettings.businessAccountId,
        webhookSecret: whatsappSettings.webhookSecret || '',
        adminPhoneNumbers: whatsappSettings.adminPhoneNumbers || [],
        notifications: whatsappSettings.notifications || {
          productSubmissions: true,
          statusUpdates: true,
          bidNotifications: false,
          auctionEndNotifications: false
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching WhatsApp settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp settings'
    });
  }
});

// Update WhatsApp settings (admin only)
router.put('/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      enabled,
      phoneNumberId,
      accessToken,
      verifyToken,
      businessAccountId,
      webhookSecret,
      adminPhoneNumbers,
      notifications
    } = req.body;

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    // Update WhatsApp settings
    settings.whatsappSettings = {
      enabled: enabled || false,
      phoneNumberId: phoneNumberId || '',
      accessToken: accessToken || '',
      verifyToken: verifyToken || '',
      businessAccountId: businessAccountId || '',
      webhookSecret: webhookSecret || '',
      adminPhoneNumbers: adminPhoneNumbers || [],
      notifications: notifications || {
        productSubmissions: true,
        statusUpdates: true,
        bidNotifications: false,
        auctionEndNotifications: false
      }
    };

    settings.lastUpdated = new Date();
    settings.updatedBy = req.user.id;

    await settings.save();

    // Reload WhatsApp service configuration
    await whatsappService.reloadConfiguration();

    res.json({
      success: true,
      message: 'WhatsApp settings updated successfully',
      data: {
        enabled: settings.whatsappSettings.enabled,
        configured: whatsappService.isConfigured
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating WhatsApp settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update WhatsApp settings',
      error: error.message
    });
  }
});

// Test WhatsApp configuration (admin only)
router.post('/test-config', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Reload configuration first
    await whatsappService.reloadConfiguration();
    
    // Get current status
    const status = whatsappService.getStatus();
    
    // Try to send a test message to the first admin phone
    let testResult = null;
    if (whatsappService.adminPhoneNumbers.length > 0) {
      const testPhone = whatsappService.adminPhoneNumbers[0];
      testResult = await whatsappService.sendMessage(
        testPhone, 
        'Test message from WhatsApp configuration. If you received this, the setup is working correctly!'
      );
    }

    res.json({
      success: true,
      message: 'Configuration test completed',
      data: {
        status,
        testResult
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing WhatsApp configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test WhatsApp configuration',
      error: error.message
    });
  }
});

module.exports = router; 