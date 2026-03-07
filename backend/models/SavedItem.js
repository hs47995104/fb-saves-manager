const mongoose = require('mongoose');

// Schema for a person/participant
const PersonSchema = new mongoose.Schema({
  name: String
}, { _id: false });

// Schema for group information
const GroupSchema = new mongoose.Schema({
  name: String
}, { _id: false });

// Schema for author information
const AuthorSchema = new mongoose.Schema({
  name: String
}, { _id: false });

// Schema for tags
const TagSchema = new mongoose.Schema({
  name: { type: String, required: true, lowercase: true, trim: true },
  color: { type: String, default: '#3498db' }
}, { _id: false });

// Schema for comments
const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Schema for a single saved item
const SavedItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  href: String,
  name: String,
  title: String,
  seen: { type: Boolean, default: false },
  lastSeenAt: { type: Date, default: null },
  favorite: { type: Boolean, default: false },
  group: {
    name: String
  },
  author: {
    name: String
  },
  tags: [TagSchema],
  comments: [CommentSchema],
  originalData: mongoose.Schema.Types.Mixed,
  itemId: { type: String, sparse: true }
}, { _id: false });

// Main schema for a collection of saved items
const CollectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Add userId field
  
  timestamp: { type: Number, required: true },
  fbid: { type: String, required: true },
  
  title: { type: String, required: true },
  description: String,
  lastUpdated: Number,
  
  participants: [String],
  saves: [SavedItemSchema],
  coverPhoto: mongoose.Schema.Types.Mixed,
  rawData: mongoose.Schema.Types.Mixed,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique fbid per user
CollectionSchema.index({ userId: 1, fbid: 1 }, { unique: true });

// Other indexes
CollectionSchema.index({ userId: 1, timestamp: -1 });
CollectionSchema.index({ userId: 1, 'saves.url': 1 });
CollectionSchema.index({ userId: 1, title: 'text' });
CollectionSchema.index({ userId: 1, 'saves.favorite': 1 });
CollectionSchema.index({ userId: 1, 'saves.tags.name': 1 });
CollectionSchema.index({ userId: 1, 'saves.seen': 1, 'saves.lastSeenAt': -1 });

module.exports = mongoose.model('Collection', CollectionSchema);