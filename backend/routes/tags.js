const express = require('express');
const router = express.Router();
const Collection = require('../models/SavedItem');
const authMiddleware = require('../middleware/auth');

// Test route to verify tags router is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Tags router is working!',
    timestamp: new Date().toISOString(),
    routes: ['GET /test', 'GET /all', 'POST /add', 'DELETE /remove', 'PATCH /color', 'GET /items/:tagName']
  });
});

// Get all unique tags for the current user
router.get('/all', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching all tags for user:', req.userId);
    
    const collections = await Collection.find(
      { userId: req.userId }, 
      { saves: 1 }
    );
    
    const tagMap = new Map();
    
    collections.forEach(collection => {
      if (collection.saves && Array.isArray(collection.saves)) {
        collection.saves.forEach(save => {
          if (save.tags && Array.isArray(save.tags)) {
            save.tags.forEach(tag => {
              const key = tag.name.toLowerCase();
              if (tagMap.has(key)) {
                tagMap.set(key, {
                  ...tagMap.get(key),
                  count: tagMap.get(key).count + 1
                });
              } else {
                tagMap.set(key, {
                  name: tag.name,
                  color: tag.color || '#3498db',
                  count: 1
                });
              }
            });
          }
        });
      }
    });
    
    const tags = Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
    
    console.log(`Found ${tags.length} unique tags`);
    
    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Error fetching all tags:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a tag to a specific save item
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndex, tag } = req.body;
    
    console.log('Adding tag:', { collectionId, saveIndex, tag });
    
    if (!collectionId || saveIndex === undefined || !tag) {
      return res.status(400).json({ error: 'Collection ID, save index, and tag are required' });
    }
    
    if (!tag.name) {
      return res.status(400).json({ error: 'Tag name is required' });
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
    
    if (!collection.saves[index].tags) {
      collection.saves[index].tags = [];
    }
    
    const tagExists = collection.saves[index].tags.some(
      t => t.name.toLowerCase() === tag.name.toLowerCase()
    );
    
    if (tagExists) {
      return res.status(400).json({ error: 'Tag already exists on this item' });
    }
    
    const newTag = {
      name: tag.name.toLowerCase().trim(),
      color: tag.color || '#3498db'
    };
    
    collection.saves[index].tags.push(newTag);
    collection.updatedAt = new Date();
    collection.markModified(`saves.${index}.tags`);
    
    await collection.save();
    
    res.json({
      success: true,
      message: 'Tag added successfully',
      tag: newTag
    });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a tag from a specific save item
router.delete('/remove', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndex, tagName } = req.body;
    
    console.log('Removing tag:', { collectionId, saveIndex, tagName });
    
    if (!collectionId || saveIndex === undefined || !tagName) {
      return res.status(400).json({ error: 'Collection ID, save index, and tag name are required' });
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
    
    if (!collection.saves[index].tags) {
      return res.status(404).json({ error: 'No tags found on this item' });
    }
    
    const originalLength = collection.saves[index].tags.length;
    collection.saves[index].tags = collection.saves[index].tags.filter(
      t => t.name.toLowerCase() !== tagName.toLowerCase()
    );
    
    if (collection.saves[index].tags.length === originalLength) {
      return res.status(404).json({ error: 'Tag not found on this item' });
    }
    
    collection.updatedAt = new Date();
    collection.markModified(`saves.${index}.tags`);
    
    await collection.save();
    
    res.json({
      success: true,
      message: 'Tag removed successfully'
    });
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update tag color
router.patch('/color', authMiddleware, async (req, res) => {
  try {
    const { tagName, color } = req.body;
    
    console.log('Updating tag color:', { tagName, color });
    
    if (!tagName || !color) {
      return res.status(400).json({ error: 'Tag name and color are required' });
    }
    
    const collections = await Collection.find({
      userId: req.userId,
      'saves.tags.name': tagName.toLowerCase()
    });
    
    let updatedCount = 0;
    
    for (const collection of collections) {
      let modified = false;
      
      if (collection.saves && Array.isArray(collection.saves)) {
        collection.saves.forEach((save, saveIndex) => {
          if (save.tags && Array.isArray(save.tags)) {
            save.tags.forEach((tag, tagIndex) => {
              if (tag.name.toLowerCase() === tagName.toLowerCase()) {
                collection.saves[saveIndex].tags[tagIndex].color = color;
                modified = true;
                updatedCount++;
              }
            });
          }
        });
      }
      
      if (modified) {
        collection.updatedAt = new Date();
        collection.markModified('saves');
        await collection.save();
      }
    }
    
    res.json({
      success: true,
      message: `Updated color for ${updatedCount} tag instances`,
      updatedCount
    });
  } catch (error) {
    console.error('Error updating tag color:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get items by tag
router.get('/items/:tagName', authMiddleware, async (req, res) => {
  try {
    const { tagName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    console.log('Fetching items by tag:', { tagName, page, limit });
    
    const collections = await Collection.find({
      userId: req.userId,
      'saves.tags.name': tagName.toLowerCase()
    });
    
    const items = [];
    
    collections.forEach(collection => {
      if (collection.saves && Array.isArray(collection.saves)) {
        collection.saves.forEach((save, saveIndex) => {
          if (save.tags && save.tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
            items.push({
              save: save,
              parentFbid: collection.fbid,
              parentId: collection.fbid,
              parentTitle: collection.title,
              parentTimestamp: collection.timestamp,
              saveIndex: saveIndex
            });
          }
        });
      }
    });
    
    const total = items.length;
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);
    
    res.json({
      success: true,
      tag: tagName,
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching items by tag:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;