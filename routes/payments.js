const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Settings = require('../models/Settings');
const Payment = require('../models/Payment');
const Auction = require('../models/Auction');
const AuctionService = require('../services/auctionService');

// Get Stripe public key from database
router.get('/stripe-key', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    
    if (!settings || !settings.paymentSettings?.stripe?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Payment system is not enabled'
      });
    }

    const publishableKey = settings.paymentSettings.stripe.publishableKey;
    
    if (!publishableKey) {
      return res.status(400).json({
        success: false,
        message: 'Stripe configuration incomplete'
      });
    }

    res.json({
      success: true,
      data: {
        publicKey: publishableKey
      }
    });
  } catch (error) {
    console.error('Get Stripe key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Stripe public key'
    });
  }
});

// Create payment intent
router.post('/create-payment-intent', verifyToken, async (req, res) => {
  try {
    const { auctionId, amount, type } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!auctionId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data'
      });
    }

    // Check if user already has a successful payment for this auction
    const existingPayment = await Payment.findByUserAndAuction(userId, auctionId, type);
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this auction'
      });
    }

    // Get Stripe settings from database
    const settings = await Settings.findOne();
    
    if (!settings || !settings.paymentSettings?.stripe?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Payment system is not enabled'
      });
    }

    const stripeSecretKey = settings.paymentSettings.stripe.apiKey;
    
    if (!stripeSecretKey) {
      return res.status(400).json({
        success: false,
        message: 'Stripe configuration incomplete'
      });
    }

    // Initialize Stripe with actual secret key from database
    const stripe = require('stripe')(stripeSecretKey);
    
    // Create actual payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: settings.paymentSettings.general.currency.toLowerCase() || 'usd',
      metadata: {
        auctionId: auctionId,
        userId: userId,
        type: type
      }
    });

    // Save payment record to database
    const payment = new Payment({
      paymentIntentId: paymentIntent.id,
      userId: userId,
      auctionId: auctionId,
      amount: amount,
      currency: paymentIntent.currency,
      type: type,
      status: 'PENDING',
      stripeDetails: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
      },
      description: `${type} payment for auction ${auctionId}`
    });

    await payment.save();

    console.log(`💳 Created payment intent: ${paymentIntent.id} for user: ${userId}, auction: ${auctionId}`);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent: ' + error.message
    });
  }
});

// Verify payment
router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const { auctionId, paymentIntentId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!auctionId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification data'
      });
    }

    // Find the payment record in our database
    const payment = await Payment.findOne({ paymentIntentId: paymentIntentId, userId: userId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Get Stripe settings from database
    const settings = await Settings.findOne();
    
    if (!settings || !settings.paymentSettings?.stripe?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Payment system is not enabled'
      });
    }

    const stripeSecretKey = settings.paymentSettings.stripe.apiKey;
    
    if (!stripeSecretKey) {
      return res.status(400).json({
        success: false,
        message: 'Stripe configuration incomplete'
      });
    }

    // Initialize Stripe and verify payment
    const stripe = require('stripe')(stripeSecretKey);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update payment record in database
      await payment.markAsSucceeded();
      
      console.log(`✅ Payment verified and saved - User: ${userId}, Auction: ${auctionId}, Payment: ${paymentIntentId}, Amount: ${paymentIntent.amount}`);

      // Send payment confirmation notification and email
      try {
        // Get the auction data for the confirmation
        const auction = await Auction.findById(auctionId);
        if (auction) {
          await AuctionService.handlePaymentConfirmation(auction, payment);
        } else {
          console.warn(`⚠️ Auction ${auctionId} not found for payment confirmation`);
        }
      } catch (notificationError) {
        console.error('❌ Error sending payment confirmation notification:', notificationError);
        // Don't fail the payment verification if notification fails
      }

      res.json({
        success: true,
        data: {
          verified: true,
          paymentId: paymentIntentId,
          auctionId: auctionId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        }
      });
    } else {
      // Update payment as failed
      await payment.markAsFailed();
      
      res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${paymentIntent.status}`
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment: ' + error.message
    });
  }
});

// Check payment status for an auction
router.get('/status/:auctionId', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user.id;

    // Query the actual payment database
    const payment = await Payment.findByUserAndAuction(userId, auctionId, 'ENTRY_FEE');
    const hasPaid = !!payment;

    console.log(`💳 Payment status check - User: ${userId}, Auction: ${auctionId}, Has Paid: ${hasPaid}`);

    res.json({
      success: true,
      data: {
        hasPaid: hasPaid,
        auctionId: auctionId,
        payment: hasPaid ? {
          id: payment._id,
          amount: payment.amount,
          paidAt: payment.paidAt,
          paymentIntentId: payment.paymentIntentId
        } : null
      }
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
});

// Get payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`📋 Getting payment history for user: ${userId}, limit: ${limit}`);

    // Get actual payment history from database
    const payments = await Payment.getUserPaymentHistory(userId, limit);
    
    console.log(`📋 Found ${payments.length} payments for user ${userId}`);

    // Format the response with proper null checks
    const formattedPayments = payments.map((payment, index) => {
      try {
        // Log if auction data is missing
        if (!payment.auctionId) {
          console.warn(`⚠️ Payment ${payment._id} has no auction data (auction may have been deleted)`);
        }

        return {
          id: payment._id,
          auctionId: payment.auctionId?._id || null,
          amount: payment.amount,
          amountInDollars: payment.amountInDollars,
          currency: payment.currency,
          status: payment.status,
          type: payment.type,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt,
          auction: payment.auctionId ? {
            title: payment.auctionId.title || 'Unknown Auction',
            image: payment.auctionId.images?.[0]?.url || 'https://via.placeholder.com/150x150?text=No+Image',
            basePrice: payment.auctionId.basePrice || 0
          } : {
            title: 'Auction Deleted',
            image: 'https://via.placeholder.com/150x150?text=Deleted',
            basePrice: 0
          },
          paymentIntentId: payment.paymentIntentId
        };
      } catch (mappingError) {
        console.error(`❌ Error formatting payment ${index}:`, mappingError);
        console.error(`❌ Payment data:`, payment);
        // Return a safe fallback object
        return {
          id: payment._id,
          auctionId: null,
          amount: payment.amount || 0,
          amountInDollars: (payment.amount || 0) / 100,
          currency: payment.currency || 'usd',
          status: payment.status || 'UNKNOWN',
          type: payment.type || 'UNKNOWN',
          createdAt: payment.createdAt,
          paidAt: payment.paidAt,
          auction: {
            title: 'Error Loading Auction',
            image: 'https://via.placeholder.com/150x150?text=Error',
            basePrice: 0
          },
          paymentIntentId: payment.paymentIntentId
        };
      }
    });

    console.log(`📋 Successfully formatted ${formattedPayments.length} payments`);

    res.json({
      success: true,
      data: {
        payments: formattedPayments,
        total: payments.length
      }
    });
  } catch (error) {
    console.error('❌ Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history: ' + error.message,
      error: error.message
    });
  }
});

// Get auction payments (for admin/seller)
router.get('/auction/:auctionId', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    // Get all payments for this auction
    const payments = await Payment.getAuctionPayments(auctionId);
    
    // Format the response
    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      amount: payment.amount,
      amountInDollars: payment.amountInDollars,
      currency: payment.currency,
      status: payment.status,
      type: payment.type,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      user: {
        id: payment.userId._id,
        name: `${payment.userId.firstName} ${payment.userId.lastName}`,
        email: payment.userId.email,
        username: payment.userId.username
      },
      paymentIntentId: payment.paymentIntentId
    }));

    res.json({
      success: true,
      data: {
        payments: formattedPayments,
        total: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (error) {
    console.error('Get auction payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get auction payments'
    });
  }
});

// Create payment intent for winning bid
router.post('/winning-payment', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!auctionId) {
      return res.status(400).json({
        success: false,
        message: 'Auction ID is required'
      });
    }

    // Check if user won this auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (auction.winnerId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not the winner of this auction'
      });
    }

    if (auction.status !== 'ENDED') {
      return res.status(400).json({
        success: false,
        message: 'Auction has not ended yet'
      });
    }

    // Check if payment already made
    const existingPayment = await Payment.findByUserAndAuction(userId, auctionId, 'WINNING_PAYMENT');
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Winning payment already completed'
      });
    }

    const paymentAmount = Math.round(auction.currentBid * 100); // Convert to cents

    // Get Stripe settings
    const settings = await Settings.findOne();
    if (!settings || !settings.paymentSettings?.stripe?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Payment system is not enabled'
      });
    }

    const stripeSecretKey = settings.paymentSettings.stripe.apiKey;
    if (!stripeSecretKey) {
      return res.status(400).json({
        success: false,
        message: 'Stripe configuration incomplete'
      });
    }

    // Create payment intent
    const stripe = require('stripe')(stripeSecretKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: paymentAmount,
      currency: settings.paymentSettings.general.currency.toLowerCase() || 'usd',
      metadata: {
        auctionId: auctionId,
        userId: userId,
        type: 'WINNING_PAYMENT'
      }
    });

    // Save payment record
    const payment = new Payment({
      paymentIntentId: paymentIntent.id,
      userId: userId,
      auctionId: auctionId,
      amount: paymentAmount,
      currency: paymentIntent.currency,
      type: 'WINNING_PAYMENT',
      status: 'PENDING',
      stripeDetails: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
      },
      description: `Winning payment for auction: ${auction.title}`
    });

    await payment.save();

    console.log(`💰 Created winning payment intent: ${paymentIntent.id} for user: ${userId}, auction: ${auctionId}, amount: $${auction.currentBid}`);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: auction.currentBid,
        auctionTitle: auction.title
      }
    });

  } catch (error) {
    console.error('Create winning payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create winning payment intent: ' + error.message
    });
  }
});

// Verify winner payment with shipping information
router.post('/verify-winner-payment', verifyToken, async (req, res) => {
  try {
    const { paymentIntentId, auctionId, shippingInfo, billingInfo } = req.body;
    const userId = req.user.id;

    console.log('🔍 Verifying winner payment:', { paymentIntentId, auctionId, userId });

    // Get Stripe settings
    const settings = await Settings.findOne();
    if (!settings?.paymentSettings?.stripe?.apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Payment system not configured'
      });
    }

    const stripe = require('stripe')(settings.paymentSettings.stripe.apiKey);

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Find the auction and verify winner
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (auction.winnerId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not the winner of this auction'
      });
    }

    // Find existing payment record
    let payment = await Payment.findOne({
      auctionId,
      userId,
      type: 'WINNING_PAYMENT',
      paymentIntentId
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update payment with shipping and billing information
    payment.status = 'COMPLETED';
    payment.shippingInfo = {
      firstName: shippingInfo.firstName,
      lastName: shippingInfo.lastName,
      email: shippingInfo.email,
      phone: shippingInfo.phone,
      address: {
        line1: shippingInfo.address,
        line2: shippingInfo.address2,
        city: shippingInfo.city,
        state: shippingInfo.state,
        postalCode: shippingInfo.zip,
        country: shippingInfo.country
      },
      deliveryInstructions: shippingInfo.deliveryInstructions
    };

    payment.billingInfo = {
      firstName: billingInfo.firstName,
      lastName: billingInfo.lastName,
      email: billingInfo.email,
      phone: billingInfo.phone,
      address: {
        line1: billingInfo.address,
        line2: billingInfo.address2,
        city: billingInfo.city,
        state: billingInfo.state,
        postalCode: billingInfo.zip,
        country: billingInfo.country
      }
    };

    payment.completedAt = new Date();
    await payment.save();

    // Update auction status to SOLD
    auction.status = 'SOLD';
    await auction.save();

    // Send confirmation emails
    try {
      const AuctionService = require('../services/auctionService');
      await AuctionService.handlePaymentConfirmation(auction, payment);
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      // Don't fail the payment verification if email fails
    }

    console.log('✅ Winner payment verified successfully');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        shippingInfo: payment.shippingInfo
      }
    });

  } catch (error) {
    console.error('❌ Winner payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

module.exports = router; 