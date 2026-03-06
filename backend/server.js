require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import routes
const itemsRouter = require('./routes/items');
const tagsRouter = require('./routes/tags');      // Add this
const commentsRouter = require('./routes/comments'); // Add this

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression());

// Body parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  skip: (req) => req.path === '/api/items/upload' // Skip rate limit for uploads
});

app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check - place this before API routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/items', itemsRouter);
app.use('/api/tags', tagsRouter);        // Add this line
app.use('/api/comments', commentsRouter); // Add this line

// 404 handler for any unmatched routes
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'File too large. Maximum size is 100MB.' 
    });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Add these options
  autoIndex: true,
  // Force UTF-8 encoding
  retryWrites: true,
  // Ensure we're using UTF-8
  family: 4 // Use IPv4, skip IPv6
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`📍 API URL: http://localhost:${PORT}/api`);
    console.log(`📍 Tags API: http://localhost:${PORT}/api/tags`);
    console.log(`📍 Comments API: http://localhost:${PORT}/api/comments`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});