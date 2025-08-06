const Settings = require('../models/Settings');

class SettingsController {
  // Get all settings
  async getSettings(req, res) {
    try {
      let settings = await Settings.findOne();
      
      // If no settings exist, create default settings
      if (!settings) {
        settings = new Settings({});
        await settings.save();
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settings'
      });
    }
  }

  // Get public settings (no authentication required)
  async getPublicSettings(req, res) {
    try {
      let settings = await Settings.findOne();
      
      // If no settings exist, create default settings
      if (!settings) {
        settings = new Settings({});
        await settings.save();
      }

      // Only return public settings
      const publicSettings = {
        paymentSettings: {
          general: {
            currency: settings.paymentSettings?.general?.currency || 'PKR'
          }
        },
        websiteSettings: {
          general: {
            websiteName: settings.websiteSettings?.general?.websiteName || 'Premium Auctions',
            websiteDescription: settings.websiteSettings?.general?.websiteDescription || ''
          }
        }
      };

      res.json({
        success: true,
        data: publicSettings
      });
    } catch (error) {
      console.error('Get public settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch public settings'
      });
    }
  }

  // Update payment settings
  async updatePaymentSettings(req, res) {
    try {
      const userId = req.user.id;
      const { paymentSettings } = req.body;

      let settings = await Settings.findOne();
      
      if (!settings) {
        settings = new Settings({});
      }

      // Update payment settings
      if (paymentSettings) {
        settings.paymentSettings = {
          ...settings.paymentSettings,
          ...paymentSettings
        };
      }

      settings.lastUpdated = new Date();
      settings.updatedBy = userId;

      await settings.save();

      res.json({
        success: true,
        message: 'Payment settings updated successfully',
        data: settings
      });
    } catch (error) {
      console.error('Update payment settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment settings'
      });
    }
  }

  // Update website settings
  async updateWebsiteSettings(req, res) {
    try {
      const userId = req.user.id;
      const { websiteSettings } = req.body;

      let settings = await Settings.findOne();
      
      if (!settings) {
        settings = new Settings({});
      }

      // Update website settings
      if (websiteSettings) {
        settings.websiteSettings = {
          ...settings.websiteSettings,
          ...websiteSettings
        };
      }

      settings.lastUpdated = new Date();
      settings.updatedBy = userId;

      await settings.save();

      res.json({
        success: true,
        message: 'Website settings updated successfully',
        data: settings
      });
    } catch (error) {
      console.error('Update website settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update website settings'
      });
    }
  }

  // Update all settings at once
  async updateAllSettings(req, res) {
    try {
      const userId = req.user.id;
      const { paymentSettings, websiteSettings } = req.body;

      let settings = await Settings.findOne();
      
      if (!settings) {
        settings = new Settings({});
      }

      // Update both payment and website settings
      if (paymentSettings) {
        settings.paymentSettings = {
          ...settings.paymentSettings,
          ...paymentSettings
        };
      }

      if (websiteSettings) {
        settings.websiteSettings = {
          ...settings.websiteSettings,
          ...websiteSettings
        };
      }

      settings.lastUpdated = new Date();
      settings.updatedBy = userId;

      await settings.save();

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: settings
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  }

  // Reset settings to defaults
  async resetSettings(req, res) {
    try {
      const userId = req.user.id;
      
      // Delete existing settings and create new default ones
      await Settings.deleteMany({});
      
      const settings = new Settings({
        updatedBy: userId
      });
      
      await settings.save();

      res.json({
        success: true,
        message: 'Settings reset to defaults successfully',
        data: settings
      });
    } catch (error) {
      console.error('Reset settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset settings'
      });
    }
  }
}

module.exports = new SettingsController(); 