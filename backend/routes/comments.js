const express = require('express');
const router = express.Router();
const Collection = require('../models/SavedItem');
const authMiddleware = require('../middleware/auth');

// Test route to verify comments router is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Comments router is working!',
    timestamp: new Date().toISOString(),
    routes: ['GET /test', 'POST /add', 'PATCH /update', 'DELETE /delete', 'GET /item/:collectionId/:saveIndex']
  });
});

// Add a comment to a specific save item
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndex, text } = req.body;
    
    console.log('Adding comment:', { collectionId, saveIndex, text });
    
    if (!collectionId || saveIndex === undefined || !text) {
      return res.status(400).json({ error: 'Collection ID, save index, and comment text are required' });
    }
    
    if (text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (maximum 1000 characters)' });
    }
    
    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: collectionId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const index = parseInt(saveIndex);
    if (!collection.saves || !Array.isArray(collection.saves) || index >= collection.saves.length) {
      return res.status(404).json({ error: 'Save item not found' });
    }
    
    if (!collection.saves[index].comments) {
      collection.saves[index].comments = [];
    }
    
    const newComment = {
      text: text.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    collection.saves[index].comments.push(newComment);
    collection.updatedAt = new Date();
    collection.markModified(`saves.${index}.comments`);
    
    await collection.save();
    
    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a comment
router.patch('/update', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndex, commentIndex, text } = req.body;
    
    console.log('Updating comment:', { collectionId, saveIndex, commentIndex, text });
    
    if (!collectionId || saveIndex === undefined || commentIndex === undefined || !text) {
      return res.status(400).json({ error: 'Collection ID, save index, comment index, and text are required' });
    }
    
    if (text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    
    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: collectionId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const sIndex = parseInt(saveIndex);
    const cIndex = parseInt(commentIndex);
    
    if (!collection.saves || !Array.isArray(collection.saves) || sIndex >= collection.saves.length) {
      return res.status(404).json({ error: 'Save item not found' });
    }
    
    if (!collection.saves[sIndex].comments || cIndex >= collection.saves[sIndex].comments.length) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    collection.saves[sIndex].comments[cIndex].text = text.trim();
    collection.saves[sIndex].comments[cIndex].updatedAt = new Date();
    collection.updatedAt = new Date();
    collection.markModified(`saves.${sIndex}.comments`);
    
    await collection.save();
    
    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment: collection.saves[sIndex].comments[cIndex]
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndex, commentIndex } = req.body;
    
    console.log('Deleting comment:', { collectionId, saveIndex, commentIndex });
    
    if (!collectionId || saveIndex === undefined || commentIndex === undefined) {
      return res.status(400).json({ error: 'Collection ID, save index, and comment index are required' });
    }
    
    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: collectionId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const sIndex = parseInt(saveIndex);
    const cIndex = parseInt(commentIndex);
    
    if (!collection.saves || !Array.isArray(collection.saves) || sIndex >= collection.saves.length) {
      return res.status(404).json({ error: 'Save item not found' });
    }
    
    if (!collection.saves[sIndex].comments || cIndex >= collection.saves[sIndex].comments.length) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    collection.saves[sIndex].comments.splice(cIndex, 1);
    collection.updatedAt = new Date();
    collection.markModified(`saves.${sIndex}.comments`);
    
    await collection.save();
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all comments for an item
router.get('/item/:collectionId/:saveIndex', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndex } = req.params;
    
    console.log('Getting comments for item:', { collectionId, saveIndex });
    
    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: collectionId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const index = parseInt(saveIndex);
    if (!collection.saves || !Array.isArray(collection.saves) || index >= collection.saves.length) {
      return res.status(404).json({ error: 'Save item not found' });
    }
    
    res.json({
      success: true,
      comments: collection.saves[index].comments || []
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;