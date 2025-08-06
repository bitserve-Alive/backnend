require('dotenv').config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || [ 'http://127.0.0.1:5500'],
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017/auction_site',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_jwt_key_here_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@pakauction.com'
  },
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://127.0.0.1:5500'
}; 