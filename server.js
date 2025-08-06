const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
const config = require('./config');
const connectDB = require('./config/database');
const mongoose = require('mongoose');
const path = require('path');
const notificationService = require('./services/notificationService');
require('dotenv').config();

// Connect to MongoDB
connectDB();

// Import routes
const apiRoutes = require('./routes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const auctionRoutes = require('./routes/auctions');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const indexRoutes = require('./routes/index');
const AuctionScheduler = require('./scheduler/auctionScheduler');

const app = express();

// Security middleware - configure helmet to be less restrictive for development
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false // Add this to allow cross-origin images
}));

// CORS configuration - Allow all development origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow common development origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:3001', // Admin dashboard
      'http://127.0.0.1:3001',
      'null', // For file:// protocol
      'https://pak-auction-gmuk.vercel.app',
      'https://pak-auction-muk.vercel.app',
      'exp://192.168.1.102:8081'
    ];
    
    // If environment variable is set, use it
    if (process.env.CORS_ORIGIN) {
      allowedOrigins.push(process.env.CORS_ORIGIN);
    }
    
    if (allowedOrigins.includes(origin) || origin === null) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Rate limiting - COMMENTED OUT FOR DEVELOPMENT
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Logging
app.use(morgan('combined'));

// Cookie parser middleware
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads - simple approach
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// API routes
app.use('/api', apiRoutes);

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'PakAuction API Server',
    status: 'Server is running',
    version: '1.0.0',
    endpoints: {
      api: '/api',
      health: '/health',
      auth: '/api/auth'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: config.nodeEnv === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
const PORT = config.port;
const server = http.createServer(app);

// Initialize WebSocket server for real-time notifications
notificationService.initializeWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🌐 CORS: Allowing all development origins`);
  console.log(`🔐 Authentication system ready`);
  console.log(`📁 API available at: http://localhost:${PORT}/api`);
  console.log(`💡 Test endpoint: http://localhost:${PORT}/health`);
  console.log(`📡 WebSocket server initialized for real-time notifications`);
  
  // Initialize auction scheduler
  AuctionScheduler.init();
}); 