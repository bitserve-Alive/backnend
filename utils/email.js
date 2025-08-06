const nodemailer = require('nodemailer');
const config = require('../config');

// Create email transporter
const createTransporter = () => {
  // Check if email credentials are configured
  if (!config.email.user || !config.email.pass) {
    console.warn('Email credentials not configured. Email functionality will be disabled.');
    return null;
  }
  
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });
};

// Send email verification
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    // If no email credentials configured, return success but log warning
    if (!transporter) {
      console.warn(`Email verification would be sent to ${email}, but email is not configured.`);
      console.warn(`Verification token: ${verificationToken}`);
      return { success: true, message: 'Email not configured - verification token logged to console' };
    }
    
    const verificationUrl = `${config.frontendUrl}/verify-email.html?token=${verificationToken}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Verify Your Email - PakAuction',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to PakAuction!</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Thank you for registering with PakAuction. To complete your registration, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #0ea5e9;">${verificationUrl}</p>
              <p>This verification link will expire in 24 hours.</p>
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  try {
    const transporter = createTransporter();
    
    // If no email credentials configured, return success but log warning
    if (!transporter) {
      console.warn(`Password reset email would be sent to ${email}, but email is not configured.`);
      console.warn(`Reset token: ${resetToken}`);
      return { success: true, message: 'Email not configured - reset token logged to console' };
    }
    
    const resetUrl = `${config.frontendUrl}/reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Reset Your Password - PakAuction',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>We received a request to reset your password for your PakAuction account.</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #0ea5e9;">${resetUrl}</p>
              <div class="warning">
                <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
              </div>
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    // If no email credentials configured, return success but log warning
    if (!transporter) {
      console.warn(`Welcome email would be sent to ${email}, but email is not configured.`);
      return { success: true, message: 'Email not configured' };
    }

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Welcome to PakAuction!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PakAuction</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to PakAuction!</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Your email has been successfully verified! Welcome to PakAuction, Pakistan's premier online auction platform.</p>
              <p>You can now:</p>
              <ul>
                <li>Browse and bid on thousands of items</li>
                <li>Create your own auctions</li>
                <li>Track your bidding activity</li>
                <li>Manage your profile and preferences</li>
              </ul>
              <div style="text-align: center;">
                <a href="${config.frontendUrl}" class="button">Start Bidding Now</a>
              </div>
              <p>If you have any questions, feel free to contact our support team.</p>
              <p>Happy bidding!</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send OTP email for mobile authentication
const sendOTPEmail = async (email, firstName, otp, type = 'verify') => {
  try {
    const transporter = createTransporter();
    
    // If no email credentials configured, return success but log warning
    if (!transporter) {
      console.warn(`OTP email would be sent to ${email}, but email is not configured.`);
      console.warn(`OTP code: ${otp} for ${type}`);
      return { success: true, message: 'Email not configured - OTP logged to console' };
    }

    const isVerification = type === 'verify';
    const subject = isVerification ? 'Verify Your Email - PakAuction' : 'Password Reset Code - PakAuction';
    const title = isVerification ? 'Email Verification' : 'Password Reset';
    const description = isVerification 
      ? 'Thank you for registering with PakAuction. To complete your registration, please enter the verification code below in your mobile app:'
      : 'We received a request to reset your password. Please enter the reset code below in your mobile app:';
    const expiryTime = isVerification ? '10 minutes' : '15 minutes';

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #0ea5e9; 
              text-align: center; 
              letter-spacing: 8px; 
              background: white; 
              padding: 20px; 
              border: 2px dashed #0ea5e9; 
              border-radius: 10px; 
              margin: 20px 0; 
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>${description}</p>
              
              <div class="otp-code">${otp}</div>
              
              <div class="warning">
                <p><strong>Important:</strong> This verification code will expire in ${expiryTime} for security reasons.</p>
              </div>
              
              <p>Please enter this 6-digit code in your PakAuction mobile app to continue.</p>
              
              ${!isVerification ? '<p>If you didn\'t request a password reset, please ignore this email. Your password will remain unchanged.</p>' : ''}
              ${isVerification ? '<p>If you didn\'t create an account with us, please ignore this email.</p>' : ''}
            </div>
            <div class="footer">
              <p>&copy; 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('OTP email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send auction ending notification to winner
const sendAuctionWinnerEmail = async (email, firstName, auction, winningBid) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn(`Auction winner email would be sent to ${email}, but email is not configured.`);
    return { success: true, message: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: `🎉 Congratulations! You Won "${auction.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Auction Won - PakAuction</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .winner-badge { background: #f0f9ff; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; padding: 15px 30px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
            .auction-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Congratulations!</h1>
              <p>You won the auction!</p>
            </div>
            <div class="content">
              <div class="winner-badge">
                <h2 style="color: #22c55e; margin: 0;">🎉 AUCTION WINNER 🎉</h2>
                <p style="font-size: 18px; margin: 10px 0 0 0;">You have successfully won this auction!</p>
              </div>
              
              <p>Dear ${firstName},</p>
              
              <p>Congratulations! You are the winning bidder for the following auction:</p>
              
              <div class="auction-details">
                <h3 style="margin-top: 0; color: #374151;">${auction.title}</h3>
                <p><strong>Your Winning Bid:</strong> $${winningBid.toLocaleString()}</p>
                <p><strong>Auction End Time:</strong> ${new Date(auction.endTime).toLocaleString()}</p>
                <p><strong>Auction ID:</strong> ${auction._id}</p>
              </div>
              
              <h3>What happens next?</h3>
              <ol>
                <li><strong>Payment:</strong> You need to complete payment for your winning bid within 48 hours</li>
                <li><strong>Shipping:</strong> The seller will ship the item once payment is confirmed</li>
                <li><strong>Delivery:</strong> You'll receive tracking information via email</li>
              </ol>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.frontendUrl}/product-detail.html?id=${auction._id}" class="button">View Auction Details</a>
                <a href="${config.frontendUrl}/dashboard.html" class="button" style="background-color: #3b82f6;">Go to Dashboard</a>
              </div>
              
              <p><strong>Important:</strong> Please complete your payment within 48 hours to secure your purchase. Failure to pay may result in the item being offered to the next highest bidder.</p>
              
              <p>Thank you for participating in our auction!</p>
              
              <p>Best regards,<br>The PakAuction Team</p>
            </div>
            <div class="footer">
              <p>This email was sent to you because you won an auction on PakAuction.</p>
              <p>© 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Auction winner email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send auction ending notification to seller
const sendAuctionEndedSellerEmail = async (email, firstName, auction, winnerInfo, winningBid) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn(`Auction ended email would be sent to ${email}, but email is not configured.`);
    return { success: true, message: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: `🎯 Your Auction "${auction.title}" Has Ended`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Auction Ended - PakAuction</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .sale-info { background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; padding: 15px 30px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
            .auction-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Auction Ended</h1>
              <p>Your auction has concluded</p>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              
              <p>Your auction has ended successfully with a winning bid!</p>
              
              <div class="sale-info">
                <h3 style="margin-top: 0; color: #3b82f6;">📊 Sale Summary</h3>
                <p><strong>Final Sale Price:</strong> $${winningBid.toLocaleString()}</p>
                <p><strong>Winner:</strong> ${winnerInfo.firstName} ${winnerInfo.lastName} (${winnerInfo.username})</p>
                <p><strong>Winner Email:</strong> ${winnerInfo.email}</p>
              </div>
              
              <div class="auction-details">
                <h3 style="margin-top: 0; color: #374151;">${auction.title}</h3>
                <p><strong>Auction End Time:</strong> ${new Date(auction.endTime).toLocaleString()}</p>
                <p><strong>Total Bids:</strong> ${auction.bidCount}</p>
                <p><strong>Auction ID:</strong> ${auction._id}</p>
              </div>
              
              <h3>What happens next?</h3>
              <ol>
                <li><strong>Payment:</strong> The winner has 48 hours to complete payment</li>
                <li><strong>Notification:</strong> You'll be notified once payment is received</li>
                <li><strong>Shipping:</strong> Prepare and ship the item within 3 business days</li>
                <li><strong>Funds:</strong> Payment will be transferred to your account after successful delivery</li>
              </ol>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.frontendUrl}/dashboard.html" class="button">Go to Dashboard</a>
                <a href="${config.frontendUrl}/product-detail.html?id=${auction._id}" class="button" style="background-color: #22c55e;">View Auction</a>
              </div>
              
              <p>Congratulations on your successful sale!</p>
              
              <p>Best regards,<br>The PakAuction Team</p>
            </div>
            <div class="footer">
              <p>This email was sent because your auction on PakAuction has ended.</p>
              <p>© 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Auction ended seller email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send outbid notification
const sendOutbidNotificationEmail = async (email, firstName, auction, yourBid, newHighestBid) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn(`Outbid notification email would be sent to ${email}, but email is not configured.`);
    return { success: true, message: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: `⚠️ You've been outbid on "${auction.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Outbid Notification - PakAuction</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .outbid-alert { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; padding: 15px 30px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
            .bid-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ You've Been Outbid!</h1>
              <p>Someone placed a higher bid</p>
            </div>
            <div class="content">
              <div class="outbid-alert">
                <h2 style="color: #f59e0b; margin: 0;">📢 OUTBID ALERT</h2>
                <p style="font-size: 18px; margin: 10px 0 0 0;">Your bid is no longer the highest!</p>
              </div>
              
              <p>Dear ${firstName},</p>
              
              <p>Someone has placed a higher bid on an auction you're participating in. Here are the details:</p>
              
              <div class="bid-details">
                <h3 style="margin-top: 0; color: #374151;">${auction.title}</h3>
                <p><strong>Your Current Bid:</strong> $${yourBid.toLocaleString()}</p>
                <p><strong>New Highest Bid:</strong> $${newHighestBid.toLocaleString()}</p>
                <p><strong>Auction Ends:</strong> ${new Date(auction.endTime).toLocaleString()}</p>
                <p><strong>Time Remaining:</strong> ${getTimeRemaining(auction.endTime)}</p>
              </div>
              
              <p><strong>Don't lose out!</strong> You can place a higher bid to regain your position as the leading bidder.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.frontendUrl}/product-detail.html?id=${auction._id}" class="button">Place Higher Bid</a>
              </div>
              
              <p>Good luck with your bidding!</p>
              
              <p>Best regards,<br>The PakAuction Team</p>
            </div>
            <div class="footer">
              <p>This email was sent because your bid status changed on PakAuction.</p>
              <p>© 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Outbid notification email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send payment confirmation email
const sendPaymentConfirmationEmail = async (email, firstName, auction, payment) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn(`Payment confirmation email would be sent to ${email}, but email is not configured.`);
    return { success: true, message: 'Email not configured' };
  }

  try {
    const isWinningPayment = payment.type === 'WINNING_PAYMENT';
    const subject = isWinningPayment ? 
      `✅ Payment Confirmed - "${auction.title}"` : 
      `✅ Entry Fee Payment Confirmed - "${auction.title}"`;

    // Format shipping address if available
    let shippingSection = '';
    if (payment.shippingInfo && isWinningPayment) {
      const shipping = payment.shippingInfo;
      shippingSection = `
        <div class="shipping-info" style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #16a34a; margin-top: 0;">📦 Shipping Information</h3>
          <div style="background: white; padding: 15px; border-radius: 8px;">
            <p><strong>Ship to:</strong><br>
            ${shipping.firstName} ${shipping.lastName}<br>
            ${shipping.address.line1}${shipping.address.line2 ? '<br>' + shipping.address.line2 : ''}<br>
            ${shipping.address.city}, ${shipping.address.state} ${shipping.address.postalCode}<br>
            ${shipping.address.country}</p>
            
            <p><strong>Contact:</strong><br>
            Email: ${shipping.email}<br>
            Phone: ${shipping.phone}</p>
            
            ${shipping.deliveryInstructions ? `
            <p><strong>Delivery Instructions:</strong><br>
            <em>${shipping.deliveryInstructions}</em></p>
            ` : ''}
          </div>
        </div>
      `;
    }

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Confirmation - PakAuction</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .payment-success { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; padding: 15px 30px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
            .payment-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Confirmed</h1>
              <p>Your payment has been processed successfully</p>
            </div>
            <div class="content">
              <div class="payment-success">
                <h2 style="color: #22c55e; margin: 0;">💳 PAYMENT SUCCESSFUL</h2>
                <p style="font-size: 18px; margin: 10px 0 0 0;">Your payment has been confirmed!</p>
              </div>
              
              <p>Dear ${firstName},</p>
              
              <p>Thank you! Your payment has been successfully processed.</p>
              
              <div class="payment-details">
                <h3 style="margin-top: 0; color: #374151;">Payment Details</h3>
                <p><strong>Auction:</strong> ${auction.title}</p>
                <p><strong>Payment Type:</strong> ${isWinningPayment ? 'Winning Bid Payment' : 'Entry Fee'}</p>
                <p><strong>Amount Paid:</strong> $${(payment.amount / 100).toFixed(2)}</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Payment ID:</strong> ${payment._id}</p>
                <p><strong>Auction ID:</strong> ${auction._id}</p>
              </div>
              
              ${shippingSection}
              
              ${isWinningPayment ? `
                <div style="background: #e0f2fe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #0277bd; margin-top: 0;">📋 What happens next?</h3>
                  <ol style="color: #333; line-height: 1.6;">
                    <li><strong>Processing:</strong> Your payment is being processed</li>
                    <li><strong>Seller Notification:</strong> The seller has been notified of your payment</li>
                    <li><strong>Shipping:</strong> The seller will prepare and ship your item within 3 business days</li>
                    <li><strong>Tracking:</strong> You'll receive tracking information via email</li>
                    <li><strong>Delivery:</strong> Your item will be delivered to your shipping address</li>
                  </ol>
                </div>
              ` : `
                <div style="background: #e8f5e8; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p><strong>🎉 You can now participate in bidding!</strong> Your entry fee payment has been confirmed, and you're all set to place bids on this auction.</p>
                </div>
              `}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.frontendUrl}/product-detail.html?id=${auction._id}" class="button">View Auction</a>
                <a href="${config.frontendUrl}/dashboard.html" class="button" style="background-color: #3b82f6;">Go to Dashboard</a>
              </div>
              
              <p>Thank you for using PakAuction!</p>
              
              <p>Best regards,<br>The PakAuction Team</p>
            </div>
            <div class="footer">
              <p>This email was sent to confirm your payment on PakAuction.</p>
              <p>Keep this email as your receipt for your records.</p>
              <p>© 2024 PakAuction. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Payment confirmation email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to calculate time remaining
const getTimeRemaining = (endTime) => {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const diff = end - now;
  
  if (diff <= 0) return 'Auction ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendAuctionWinnerEmail,
  sendAuctionEndedSellerEmail,
  sendOutbidNotificationEmail,
  sendPaymentConfirmationEmail
}; 