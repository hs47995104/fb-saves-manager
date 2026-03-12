const mongoose = require('mongoose');

// Schema for a person/participant (embedded in collections)
const PersonSchema = new mongoose.Schema({
  name: String
}, { _id: false });

// Schema for group information (embedded in saves)
const GroupSchema = new mongoose.Schema({
  name: String
}, { _id: false });

// Schema for author information (embedded in saves)
const AuthorSchema = new mongoose.Schema({
  name: String
}, { _id: false });

// Schema for tags (embedded in saves)
const TagSchema = new mongoose.Schema({
  name: { type: String, required: true, lowercase: true, trim: true },
  color: { type: String, default: '#3498db' }
}, { _id: false });

// Schema for comments (embedded in saves)
const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Schema for a single saved item
const SavedItemSchema = new mongoose.Schema({
  url: { 
    type: String, 
    required: true,
    index: true // Index for faster duplicate detection
  },
  href: String,
  name: String,
  title: String,
  
  // NEW: Type classification for better filtering
  type: { 
    type: String, 
    enum: ['video', 'reel', 'group_post', 'post', 'photo', 'link', 'unknown'],
    default: 'unknown',
    index: true // Index for faster type-based queries
  },
  
  // Facebook's media type if available
  mediaType: { 
    type: String,
    sparse: true // Only index when present
  },
  
  // Status flags
  seen: { 
    type: Boolean, 
    default: false,
    index: true
  },
  lastSeenAt: { 
    type: Date, 
    default: null,
    index: true
  },
  favorite: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  // Related entities (embedded for simplicity, could be referenced in future)
  group: {
    name: String
  },
  author: {
    name: String
  },
  
  // User-generated content
  tags: [TagSchema],
  comments: [CommentSchema],
  
  // Unique identifier for this save (for future referencing)
  itemId: { 
    type: String, 
    sparse: true,
    unique: true,
    index: true
  }
  
  // originalData intentionally removed to save storage
}, { 
  _id: false,
  timestamps: false // Don't add createdAt/updatedAt to each save
});

// Main schema for a collection of saved items
const CollectionSchema = new mongoose.Schema({
  // User ownership
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Facebook metadata
  timestamp: { 
    type: Number, 
    required: true,
    index: true
  },
  fbid: { 
    type: String, 
    required: true 
  },
  
  // Collection metadata
  title: { 
    type: String, 
    required: true,
    text: true // Enable text search on titles
  },
  description: {
    type: String,
    text: true // Enable text search on descriptions
  },
  lastUpdated: Number,
  
  // Participants in this collection
  participants: [String],
  
  // The actual saved items
  saves: [SavedItemSchema],
  
  // Cover photo metadata
  coverPhoto: mongoose.Schema.Types.Mixed,
  
  // System timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique fbid per user
CollectionSchema.index({ userId: 1, fbid: 1 }, { unique: true });

// Index for sorting by timestamp (most recent first)
CollectionSchema.index({ userId: 1, timestamp: -1 });

// Index for filtering by update time
CollectionSchema.index({ userId: 1, updatedAt: -1 });

// Index for text search on title and description
CollectionSchema.index({ 
  userId: 1, 
  title: 'text', 
  description: 'text' 
});

// Index for favorite items across collections
CollectionSchema.index({ userId: 1, 'saves.favorite': 1 });

// Index for tag-based queries
CollectionSchema.index({ userId: 1, 'saves.tags.name': 1 });

// Index for seen status with timestamp (for "seen recently" queries)
CollectionSchema.index({ 
  userId: 1, 
  'saves.seen': 1, 
  'saves.lastSeenAt': -1 
});

// Index for URL-based duplicate detection
CollectionSchema.index({ userId: 1, 'saves.url': 1 });

// Index for type-based filtering
CollectionSchema.index({ userId: 1, 'saves.type': 1 });

// Index for itemId lookups
CollectionSchema.index({ userId: 1, 'saves.itemId': 1 });

// Virtual for total saves count (useful for stats)
CollectionSchema.virtual('savesCount').get(function() {
  return this.saves ? this.saves.length : 0;
});

// Virtual for seen saves count
CollectionSchema.virtual('seenCount').get(function() {
  if (!this.saves) return 0;
  return this.saves.filter(s => s.seen).length;
});

// Virtual for favorite saves count
CollectionSchema.virtual('favoriteCount').get(function() {
  if (!this.saves) return 0;
  return this.saves.filter(s => s.favorite).length;
});

// Method to get type statistics for this collection
CollectionSchema.methods.getTypeStats = function() {
  if (!this.saves) return {};
  
  const stats = {};
  this.saves.forEach(save => {
    const type = save.type || 'unknown';
    stats[type] = (stats[type] || 0) + 1;
  });
  return stats;
};

// Pre-save middleware to update timestamps
CollectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find duplicates across collections for a user
CollectionSchema.statics.findDuplicates = async function(userId, url) {
  if (!url) return [];
  
  const collections = await this.find(
    { 
      userId: userId,
      'saves.url': url 
    },
    { 
      'saves.$': 1,
      title: 1,
      fbid: 1 
    }
  );
  
  return collections;
};

// Static method to get global stats for a user
CollectionSchema.statics.getUserStats = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: userId } },
    { $group: {
      _id: null,
      totalCollections: { $sum: 1 },
      totalSaves: { $sum: { $size: '$saves' } },
      totalSeen: { $sum: { 
        $size: { 
          $filter: { 
            input: '$saves', 
            as: 'save', 
            cond: '$$save.seen' 
          }
        }
      }},
      totalFavorites: { $sum: { 
        $size: { 
          $filter: { 
            input: '$saves', 
            as: 'save', 
            cond: '$$save.favorite' 
          }
        }
      }}
    }}
  ]);
  
  return result[0] || { 
    totalCollections: 0, 
    totalSaves: 0, 
    totalSeen: 0, 
    totalFavorites: 0 
  };
};

// Static method to get type distribution for a user
CollectionSchema.statics.getTypeDistribution = async function(userId) {
  return this.aggregate([
    { $match: { userId: userId } },
    { $unwind: '$saves' },
    { $group: {
      _id: '$saves.type',
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Collection', CollectionSchema);