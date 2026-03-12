require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import routes
const authRouter = require('./routes/auth');
const itemsRouter = require('./routes/items');
const tagsRouter = require('./routes/tags');
const commentsRouter = require('./routes/comments');

// Import middleware
const authMiddleware = require('./middleware/auth');

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
  skip: (req) => req.path === '/api/items/upload' || req.path.startsWith('/api/auth')
});

app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Test route to verify server is running
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/comments', commentsRouter);

// Debug route to list all registered routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/routes', (req, res) => {
    const routes = [];
    
    // Helper to extract routes from a router stack
    const extractRoutes = (stack, basePath = '') => {
      stack.forEach((layer) => {
        if (layer.route) {
          // Direct route
          const path = basePath + layer.route.path;
          const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
          routes.push({ path, methods });
        } else if (layer.name === 'router' && layer.handle.stack) {
          // Router middleware
          const routerPath = basePath + (layer.regexp.source
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param')
            .replace(/\\/g, ''));
          extractRoutes(layer.handle.stack, routerPath);
        }
      });
    };
    
    extractRoutes(app._router.stack);
    
    res.json({
      totalRoutes: routes.length,
      routes: routes.sort((a, b) => a.path.localeCompare(b.path))
    });
  });

  // Debug endpoint to check collection structure - NOW authMiddleware is defined
  app.get('/api/debug/collection/:fbid', authMiddleware, async (req, res) => {
    try {
      const Collection = require('./models/SavedItem');
      const collection = await Collection.findOne({ 
        userId: req.userId,
        fbid: req.params.fbid 
      });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      
      // Show structure of first save
      const sampleSave = collection.saves && collection.saves.length > 0 
        ? collection.saves[0] 
        : null;
      
      res.json({
        collection: {
          fbid: collection.fbid,
          title: collection.title,
          savesCount: collection.saves?.length || 0
        },
        sampleSaveFields: sampleSave ? Object.keys(sampleSave.toObject()) : 'No saves',
        sampleSave: sampleSave
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// 404 handler for any unmatched routes
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
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
  autoIndex: true,
  retryWrites: true,
  family: 4
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`📍 API URL: http://localhost:${PORT}/api`);
    console.log(`📍 Auth URL: http://localhost:${PORT}/api/auth`);
    console.log(`📍 Items URL: http://localhost:${PORT}/api/items`);
    console.log(`📍 Tags URL: http://localhost:${PORT}/api/tags`);
    console.log(`📍 Comments URL: http://localhost:${PORT}/api/comments`);
    console.log(`📍 Test URL: http://localhost:${PORT}/api/test`);
    console.log(`📍 Routes URL: http://localhost:${PORT}/api/routes`);
    console.log(`📍 Debug URL: http://localhost:${PORT}/api/debug/collection/:fbid`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});