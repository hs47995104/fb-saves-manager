const express = require('express');
const router = express.Router();
const Collection = require('../models/SavedItem');

// ============= TAG ROUTES =============

// Get all unique tags across all items
router.get('/all', async (req, res) => {
  try {
    const collections = await Collection.find({}, { saves: 1 });
    
    const tagMap = new Map(); // Use Map to store unique tags with their counts
    
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
    
    // Convert Map to array and sort by count (most popular first)
    const tags = Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
    
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
router.post('/add', async (req, res) => {
  try {
    const { collectionId, saveIndex, tag } = req.body;
    
    console.log('Adding tag:', { collectionId, saveIndex, tag });
    
    if (!collectionId || saveIndex === undefined || !tag) {
      return res.status(400).json({ error: 'Collection ID, save index, and tag are required' });
    }
    
    if (!tag.name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    const collection = await Collection.findOne({ fbid: collectionId });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    if (!collection.saves || !Array.isArray(collection.saves) || saveIndex >= collection.saves.length) {
      return res.status(404).json({ error: 'Save item not found' });
    }
    
    // Initialize tags array if it doesn't exist
    if (!collection.saves[saveIndex].tags) {
      collection.saves[saveIndex].tags = [];
    }
    
    // Check if tag already exists (case insensitive)
    const tagExists = collection.saves[saveIndex].tags.some(
      t => t.name.toLowerCase() === tag.name.toLowerCase()
    );
    
    if (tagExists) {
      return res.status(400).json({ error: 'Tag already exists on this item' });
    }
    
    // Add the new tag
    const newTag = {
      name: tag.name.toLowerCase().trim(),
      color: tag.color || '#3498db'
    };
    
    collection.saves[saveIndex].tags.push(newTag);
    collection.updatedAt = new Date();
    collection.markModified(`saves.${saveIndex}.tags`);
    
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
router.delete('/remove', async (req, res) => {
  try {
    const { collectionId, saveIndex, tagName } = req.body;
    
    console.log('Removing tag:', { collectionId, saveIndex, tagName });
    
    if (!collectionId || saveIndex === undefined || !tagName) {
      return res.status(400).json({ error: 'Collection ID, save index, and tag name are required' });
    }
    
    const collection = await Collection.findOne({ fbid: collectionId });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    if (!collection.saves || !Array.isArray(collection.saves) || saveIndex >= collection.saves.length) {
      return res.status(404).json({ error: 'Save item not found' });
    }
    
    if (!collection.saves[saveIndex].tags) {
      return res.status(404).json({ error: 'No tags found on this item' });
    }
    
    // Filter out the tag (case insensitive)
    const originalLength = collection.saves[saveIndex].tags.length;
    collection.saves[saveIndex].tags = collection.saves[saveIndex].tags.filter(
      t => t.name.toLowerCase() !== tagName.toLowerCase()
    );
    
    if (collection.saves[saveIndex].tags.length === originalLength) {
      return res.status(404).json({ error: 'Tag not found on this item' });
    }
    
    collection.updatedAt = new Date();
    collection.markModified(`saves.${saveIndex}.tags`);
    
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

// Update tag color (for all instances of a tag)
router.patch('/color', async (req, res) => {
  try {
    const { tagName, color } = req.body;
    
    if (!tagName || !color) {
      return res.status(400).json({ error: 'Tag name and color are required' });
    }
    
    // Find all collections that have this tag
    const collections = await Collection.find({
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
router.get('/items/:tagName', async (req, res) => {
  try {
    const { tagName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const collections = await Collection.find({
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
    
    // Paginate
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