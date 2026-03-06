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
  color: { type: String, default: '#3498db' } // Optional color for UI
}, { _id: false });

// Schema for comments
const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Schema for a single saved item (video, post, reel, etc.)
const SavedItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  href: String,
  name: String,
  title: String,
  seen: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  // Group info if it's a group post
  group: {
    name: String
  },
  // Author info if available
  author: {
    name: String
  },
  // Tags for this item
  tags: [TagSchema],
  // Comments for this item
  comments: [CommentSchema],
  // Keep track of all original data for this save
  originalData: mongoose.Schema.Types.Mixed,
  // Add a unique identifier for the item
  itemId: { type: String, unique: true, sparse: true }
}, { _id: false });

// Main schema for a collection of saved items
const CollectionSchema = new mongoose.Schema({
  // Basic info
  timestamp: { type: Number, required: true },
  fbid: { type: String, required: true, unique: true },
  
  // Collection metadata from label_values
  title: { type: String, required: true },
  description: String,
  lastUpdated: Number,
  
  // Participants in this collection
  participants: [String],
  
  // The actual saved items
  saves: [SavedItemSchema],
  
  // Cover photo info (if any)
  coverPhoto: mongoose.Schema.Types.Mixed,
  
  // Keep the entire original document for reference
  rawData: mongoose.Schema.Types.Mixed,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better query performance
CollectionSchema.index({ fbid: 1 });
CollectionSchema.index({ timestamp: -1 });
CollectionSchema.index({ 'saves.url': 1 });
CollectionSchema.index({ title: 'text' });
CollectionSchema.index({ 'saves.itemId': 1 });
CollectionSchema.index({ timestamp: -1, 'saves.seen': 1 });
CollectionSchema.index({ 'saves.favorite': 1, timestamp: -1 });
CollectionSchema.index({ title: 'text', 'saves.title': 'text' });
CollectionSchema.index({ 'saves.tags.name': 1 }); // Index for tag search
CollectionSchema.index({ 'saves.comments.text': 'text' }); // Text index for comment search

module.exports = mongoose.model('Collection', CollectionSchema);