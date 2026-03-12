const express = require('express');
const router = express.Router();
const Collection = require('../models/SavedItem');
const { parseSavedItems } = require('../utils/jsonParser');
const authMiddleware = require('../middleware/auth');

// ============= TEST ROUTE =============
router.get('/test', (req, res) => {
  res.json({ message: 'Items router is working!' });
});

// ============= GET ROUTES =============

// Get all collections (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const collections = await Collection.find({ userId: req.userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Collection.countDocuments({ userId: req.userId });

    res.json({
      items: collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all collections (no pagination)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const collections = await Collection.find({ userId: req.userId })
      .sort({ timestamp: -1 });
    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get simplified collections list for dropdowns
router.get('/collections/simple', authMiddleware, async (req, res) => {
  try {
    const collections = await Collection.find(
      { userId: req.userId },
      {
        fbid: 1,
        title: 1,
        'saves': 1,
        timestamp: 1
      }
    ).sort({ title: 1 });

    const simplified = collections.map(c => ({
      fbid: c.fbid,
      title: c.title,
      itemCount: c.saves ? c.saves.length : 0,
      timestamp: c.timestamp
    }));

    res.json(simplified);
  } catch (error) {
    console.error('Error fetching simple collections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const totalCollections = await Collection.countDocuments({ userId: req.userId });
    const collections = await Collection.find({ userId: req.userId }, { saves: 1 });
    
    let totalSaves = 0;
    let seenSaves = 0;
    let favoriteSaves = 0;
    
    collections.forEach(collection => {
      if (collection.saves && Array.isArray(collection.saves)) {
        totalSaves += collection.saves.length;
        seenSaves += collection.saves.filter(s => s.seen).length;
        favoriteSaves += collection.saves.filter(s => s.favorite).length;
      }
    });

    res.json({
      totalCollections,
      totalSaves,
      seenSaves,
      favoriteSaves
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get flattened saves with pagination
router.get('/saves', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const collections = await Collection.find({ userId: req.userId }).sort({ timestamp: -1 });

    let allSaves = [];
    collections.forEach(collection => {
      if (collection.saves && Array.isArray(collection.saves)) {
        collection.saves.forEach((save, index) => {
          allSaves.push({
            save: save,
            parentFbid: collection.fbid,
            parentId: collection.fbid,
            parentTitle: collection.title,
            parentTimestamp: collection.timestamp,
            saveIndex: index
          });
        });
      }
    });

    const total = allSaves.length;
    const paginatedSaves = allSaves.slice(skip, skip + limit);

    res.json({
      items: paginatedSaves,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching saves:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recently seen items (ordered by lastSeenAt)
router.get('/saves/seen/recent', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const collections = await Collection.find({ userId: req.userId });

    let seenItems = [];
    collections.forEach(collection => {
      if (collection.saves && Array.isArray(collection.saves)) {
        collection.saves.forEach((save, index) => {
          // Only include items that have been seen and have a lastSeenAt timestamp
          if (save.seen && save.lastSeenAt) {
            seenItems.push({
              save: save,
              parentFbid: collection.fbid,
              parentId: collection.fbid,
              parentTitle: collection.title,
              parentTimestamp: collection.timestamp,
              saveIndex: index,
              lastSeenAt: save.lastSeenAt
            });
          }
        });
      }
    });

    // Sort by lastSeenAt (most recent first)
    seenItems.sort((a, b) => {
      return new Date(b.lastSeenAt) - new Date(a.lastSeenAt);
    });

    const total = seenItems.length;
    const paginatedItems = seenItems.slice(skip, skip + limit);

    res.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching recently seen items:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= POST ROUTES (CREATE) =============

// Upload endpoint
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { jsonData } = req.body;
    
    if (!jsonData) {
      return res.status(400).json({ error: 'No JSON data provided' });
    }

    // Parse with encoding fix built into jsonParser
    const parsedItems = parseSavedItems(jsonData);
    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (const item of parsedItems) {
      try {
        // Check if collection exists for this user
        const existingItem = await Collection.findOne({ 
          userId: req.userId,
          fbid: item.fbid 
        });
        
        if (existingItem) {
          // Preserve seen, favorite, tags, and comments status
          const existingSavesMap = new Map(
            existingItem.saves.map(s => [s.url, { 
              seen: s.seen,
              favorite: s.favorite || false,
              tags: s.tags || [],
              comments: s.comments || []
            }])
          );

          item.saves = item.saves.map(save => {
            const existing = existingSavesMap.get(save.url);
            if (existing) {
              return { 
                ...save, 
                seen: existing.seen,
                favorite: existing.favorite,
                tags: existing.tags,
                comments: existing.comments
              };
            }
            return save;
          });

          await Collection.updateOne(
            { userId: req.userId, fbid: item.fbid },
            { $set: { ...item, userId: req.userId, updatedAt: new Date() } }
          );
          updated++;
        } else {
          await Collection.create({ ...item, userId: req.userId });
          imported++;
        }
      } catch (err) {
        console.error(`Failed to process item:`, err);
        failed++;
      }
    }

    res.json({
      message: 'Import completed',
      stats: { imported, updated, failed, total: parsedItems.length }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new collection
router.post('/collections', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Collection title is required' });
    }

    // Generate a unique fbid for the new collection
    const newFbid = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newCollection = new Collection({
      userId: req.userId,
      timestamp: Math.floor(Date.now() / 1000),
      fbid: newFbid,
      title: title,
      description: description || '',
      participants: [],
      saves: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newCollection.save();

    res.status(201).json({
      message: 'Collection created successfully',
      success: true,
      collection: newCollection
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move an item from one collection to another - FIXED VERSION
router.post('/items/move', authMiddleware, async (req, res) => {
  try {
    const { sourceCollectionId, targetCollectionId, saveIndex, itemId } = req.body;
    
    console.log('Moving item:', { sourceCollectionId, targetCollectionId, saveIndex, itemId });

    if (!sourceCollectionId || !targetCollectionId) {
      return res.status(400).json({ error: 'Source and target collection IDs are required' });
    }

    // Find source and target collections - verify they belong to the user
    const sourceCollection = await Collection.findOne({ 
      userId: req.userId,
      fbid: sourceCollectionId 
    });
    const targetCollection = await Collection.findOne({ 
      userId: req.userId,
      fbid: targetCollectionId 
    });

    if (!sourceCollection) {
      return res.status(404).json({ error: 'Source collection not found' });
    }

    if (!targetCollection) {
      return res.status(404).json({ error: 'Target collection not found' });
    }

    // Find the item to move
    let itemToMove = null;
    let actualSaveIndex = saveIndex;
    
    if (saveIndex !== undefined && saveIndex !== null) {
      // Move by index
      if (saveIndex < 0 || saveIndex >= sourceCollection.saves.length) {
        return res.status(404).json({ error: 'Save not found at specified index' });
      }
      
      // Get the save as a plain object to avoid Mongoose issues
      // Use toObject() to get a plain JavaScript object
      const saveDoc = sourceCollection.saves[saveIndex];
      itemToMove = saveDoc.toObject ? saveDoc.toObject() : { ...saveDoc };
      
      // Ensure all required fields exist
      if (!itemToMove.url) {
        return res.status(400).json({ error: 'Cannot move item: missing URL' });
      }
      
      // Remove from source
      sourceCollection.saves.splice(saveIndex, 1);
      
    } else if (itemId) {
      // Move by itemId
      const itemIndex = sourceCollection.saves.findIndex(s => s.itemId === itemId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found in source collection' });
      }
      
      const saveDoc = sourceCollection.saves[itemIndex];
      itemToMove = saveDoc.toObject ? saveDoc.toObject() : { ...saveDoc };
      sourceCollection.saves.splice(itemIndex, 1);
      actualSaveIndex = itemIndex;
    } else {
      return res.status(400).json({ error: 'Either saveIndex or itemId is required' });
    }

    if (!itemToMove) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Generate a unique itemId if it doesn't exist
    if (!itemToMove.itemId) {
      itemToMove.itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Remove _id if it exists (Mongoose will add a new one when pushing)
    delete itemToMove._id;
    
    // Ensure all required fields are present
    if (!itemToMove.url) {
      return res.status(400).json({ error: 'Item has no URL' });
    }

    // Add to target collection
    targetCollection.saves.push(itemToMove);

    // Update timestamps
    sourceCollection.updatedAt = new Date();
    targetCollection.updatedAt = new Date();

    // Mark modified paths to ensure changes are saved
    sourceCollection.markModified('saves');
    targetCollection.markModified('saves');

    // Save both collections
    await sourceCollection.save();
    await targetCollection.save();

    console.log('Item moved successfully');

    res.json({
      message: 'Item moved successfully',
      success: true,
      sourceCollection: {
        fbid: sourceCollection.fbid,
        title: sourceCollection.title,
        savesCount: sourceCollection.saves.length
      },
      targetCollection: {
        fbid: targetCollection.fbid,
        title: targetCollection.title,
        savesCount: targetCollection.saves.length
      },
      movedItem: itemToMove
    });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete saves
router.post('/saves/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { items, collectionId, criteria, saveIds } = req.body;
    
    console.log('Bulk deleting saves:', { items, collectionId, criteria, saveIds });

    let deletedCount = 0;
    let modifiedCollections = [];

    // Handle direct items array (from frontend BatchActionBar)
    if (items && Array.isArray(items) && items.length > 0) {
      console.log(`Processing ${items.length} items for bulk delete`);
      
      // Group items by collection for efficient processing
      const itemsByCollection = {};
      
      items.forEach(item => {
        if (!item.collectionId) {
          console.error('Item missing collectionId:', item);
          return;
        }
        
        if (!itemsByCollection[item.collectionId]) {
          itemsByCollection[item.collectionId] = [];
        }
        itemsByCollection[item.collectionId].push(item);
      });

      // Process each collection
      for (const [collId, collItems] of Object.entries(itemsByCollection)) {
        const collection = await Collection.findOne({ 
          userId: req.userId,
          fbid: collId 
        });
        
        if (!collection) {
          console.error(`Collection not found: ${collId}`);
          continue;
        }

        const originalLength = collection.saves.length;
        
        // Sort indices in descending order to remove from the end first
        // This prevents index shifting issues when removing multiple items
        const indicesToRemove = collItems
          .map(item => item.saveIndex)
          .filter(index => index !== undefined && index >= 0 && index < collection.saves.length)
          .sort((a, b) => b - a);
        
        // Remove items
        indicesToRemove.forEach(index => {
          collection.saves.splice(index, 1);
          deletedCount++;
        });

        if (indicesToRemove.length > 0) {
          collection.updatedAt = new Date();
          collection.markModified('saves');
          await collection.save();
          
          modifiedCollections.push({
            collectionId: collection.fbid,
            title: collection.title,
            deleted: indicesToRemove.length,
            remaining: collection.saves.length
          });
        }
      }
    }
    // Handle saveIds + collectionId format (from DuplicateManager)
    else if (collectionId && saveIds && Array.isArray(saveIds)) {
      const collection = await Collection.findOne({ 
        userId: req.userId,
        fbid: collectionId 
      });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const originalLength = collection.saves.length;
      
      // Filter out saves based on URL or index
      collection.saves = collection.saves.filter((save, index) => {
        const shouldDelete = saveIds.includes(save.url) || 
                            saveIds.includes(index.toString());
        if (shouldDelete) deletedCount++;
        return !shouldDelete;
      });

      if (deletedCount > 0) {
        collection.updatedAt = new Date();
        collection.markModified('saves');
        await collection.save();
        
        modifiedCollections.push({
          collectionId: collection.fbid,
          title: collection.title,
          deleted: originalLength - collection.saves.length,
          remaining: collection.saves.length
        });
      }
    } 
    else if (criteria) {
      // Handle criteria-based deletion (e.g., delete all seen)
      const collections = await Collection.find({ userId: req.userId });
      
      for (const collection of collections) {
        const originalLength = collection.saves.length;
        
        // Apply deletion criteria
        if (criteria.seen === true) {
          collection.saves = collection.saves.filter(save => !save.seen);
        }
        if (criteria.urlPattern) {
          const regex = new RegExp(criteria.urlPattern);
          collection.saves = collection.saves.filter(save => !regex.test(save.url));
        }
        if (criteria.beforeTimestamp) {
          collection.saves = collection.saves.filter(
            save => !save.timestamp || save.timestamp > criteria.beforeTimestamp
          );
        }

        const deleted = originalLength - collection.saves.length;
        if (deleted > 0) {
          deletedCount += deleted;
          collection.updatedAt = new Date();
          collection.markModified('saves');
          await collection.save();
          
          modifiedCollections.push({
            collectionId: collection.fbid,
            title: collection.title,
            deleted,
            remaining: collection.saves.length
          });
        }
      }
    }
    else {
      return res.status(400).json({ error: 'No valid delete criteria provided' });
    }

    res.json({
      message: `Successfully deleted ${deletedCount} saves`,
      success: true,
      deletedCount,
      modifiedCollections
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= PATCH ROUTES (UPDATE) =============

// Update seen status (with lastSeenAt tracking)
router.patch('/save/:itemId/:saveIndex/seen', authMiddleware, async (req, res) => {
  try {
    const { itemId, saveIndex } = req.params;
    const { seen } = req.body;
    
    console.log('Received seen update request:', { itemId, saveIndex, seen });

    // Validate input
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const index = parseInt(saveIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid save index' });
    }

    if (typeof seen !== 'boolean') {
      return res.status(400).json({ error: 'Seen status must be a boolean' });
    }

    // Find the collection - verify it belongs to the user
    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: itemId 
    });
    
    if (!collection) {
      console.log('Collection not found with fbid:', itemId);
      return res.status(404).json({ error: 'Collection not found' });
    }

    console.log('Found collection:', { 
      title: collection.title, 
      savesCount: collection.saves?.length 
    });

    // Check if saves array exists and has the index
    if (!collection.saves || !Array.isArray(collection.saves)) {
      return res.status(404).json({ error: 'No saves found in this collection' });
    }

    if (index >= collection.saves.length) {
      return res.status(404).json({ 
        error: `Save not found at index ${index}. Total saves: ${collection.saves.length}` 
      });
    }

    // Update the save - set lastSeenAt when marking as seen
    collection.saves[index].seen = seen;
    if (seen) {
      collection.saves[index].lastSeenAt = new Date();
    } else {
      // Optionally clear lastSeenAt when marking as unseen
      collection.saves[index].lastSeenAt = null;
    }
    collection.updatedAt = new Date();
    
    // Mark this path as modified (helps with nested objects)
    collection.markModified(`saves.${index}`);
    
    await collection.save();
    console.log('Successfully updated seen status for save at index:', index);

    res.json({ 
      message: 'Seen status updated',
      success: true,
      save: collection.saves[index]
    });
  } catch (error) {
    console.error('Error updating seen status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update favorite status
router.patch('/save/:itemId/:saveIndex/favorite', authMiddleware, async (req, res) => {
  try {
    const { itemId, saveIndex } = req.params;
    const { favorite } = req.body;
    
    console.log('Received favorite update request:', { itemId, saveIndex, favorite });

    // Validate input
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const index = parseInt(saveIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid save index' });
    }

    if (typeof favorite !== 'boolean') {
      return res.status(400).json({ error: 'Favorite status must be a boolean' });
    }

    // Find the collection - verify it belongs to the user
    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: itemId 
    });
    
    if (!collection) {
      console.log('Collection not found with fbid:', itemId);
      return res.status(404).json({ error: 'Collection not found' });
    }

    console.log('Found collection:', { 
      title: collection.title, 
      savesCount: collection.saves?.length 
    });

    // Check if saves array exists and has the index
    if (!collection.saves || !Array.isArray(collection.saves)) {
      return res.status(404).json({ error: 'No saves found in this collection' });
    }

    if (index >= collection.saves.length) {
      return res.status(404).json({ 
        error: `Save not found at index ${index}. Total saves: ${collection.saves.length}` 
      });
    }

    // Update the save
    collection.saves[index].favorite = favorite;
    collection.updatedAt = new Date();
    
    // Mark this path as modified (helps with nested objects)
    collection.markModified(`saves.${index}`);
    
    await collection.save();
    console.log('Successfully updated favorite status for save at index:', index);

    res.json({ 
      message: 'Favorite status updated',
      success: true,
      save: collection.saves[index]
    });
  } catch (error) {
    console.error('Error updating favorite status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update seen status
router.patch('/saves/seen/bulk', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndices, seen } = req.body;
    
    console.log('Bulk updating seen status:', { collectionId, saveIndices, seen });

    if (!collectionId || !Array.isArray(saveIndices)) {
      return res.status(400).json({ error: 'Collection ID and save indices are required' });
    }

    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: collectionId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    let updatedCount = 0;
    const now = new Date();
    
    saveIndices.forEach(index => {
      if (index >= 0 && index < collection.saves.length) {
        collection.saves[index].seen = seen;
        if (seen) {
          collection.saves[index].lastSeenAt = now;
        } else {
          collection.saves[index].lastSeenAt = null;
        }
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      collection.updatedAt = new Date();
      collection.markModified('saves');
      await collection.save();
    }

    res.json({
      message: `Updated ${updatedCount} saves`,
      success: true,
      updatedCount
    });
  } catch (error) {
    console.error('Error bulk updating seen status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update favorite status
router.patch('/saves/favorite/bulk', authMiddleware, async (req, res) => {
  try {
    const { collectionId, saveIndices, favorite } = req.body;
    
    console.log('Bulk updating favorite status:', { collectionId, saveIndices, favorite });

    if (!collectionId || !Array.isArray(saveIndices)) {
      return res.status(400).json({ error: 'Collection ID and save indices are required' });
    }

    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: collectionId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    let updatedCount = 0;
    
    saveIndices.forEach(index => {
      if (index >= 0 && index < collection.saves.length) {
        collection.saves[index].favorite = favorite;
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      collection.updatedAt = new Date();
      collection.markModified('saves');
      await collection.save();
    }

    res.json({
      message: `Updated ${updatedCount} saves`,
      success: true,
      updatedCount
    });
  } catch (error) {
    console.error('Error bulk updating favorite status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update collection metadata
router.patch('/collection/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, description } = req.body;
    
    console.log('Updating collection:', { itemId, title, description });

    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: itemId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (title !== undefined) collection.title = title;
    if (description !== undefined) collection.description = description;
    
    collection.updatedAt = new Date();
    await collection.save();

    res.json({
      message: 'Collection updated successfully',
      success: true,
      collection: {
        fbid: collection.fbid,
        title: collection.title,
        description: collection.description
      }
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= DELETE ROUTES =============

// Delete a single save from a collection
router.delete('/save/:itemId/:saveIndex', authMiddleware, async (req, res) => {
  try {
    const { itemId, saveIndex } = req.params;
    
    console.log('========== DELETE SAVE REQUEST ==========');
    console.log('Deleting save - params:', { itemId, saveIndex });

    // Validate input
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const index = parseInt(saveIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid save index' });
    }

    // Find the collection - verify it belongs to the user
    const collection = await Collection.findOne({ 
      userId: req.userId,
      fbid: itemId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Check if saves array exists and has the index
    if (!collection.saves || !Array.isArray(collection.saves)) {
      return res.status(404).json({ error: 'No saves found in this collection' });
    }

    if (index >= collection.saves.length) {
      return res.status(404).json({ 
        error: `Save not found at index ${index}. Total saves: ${collection.saves.length}` 
      });
    }

    // Store the deleted save info for response
    const deletedSave = collection.saves[index].toObject 
      ? collection.saves[index].toObject() 
      : { ...collection.saves[index] };
    
    console.log('Deleting save at index:', index, 'URL:', deletedSave.url);

    // Remove the save from the array
    collection.saves.splice(index, 1);
    collection.updatedAt = new Date();
    collection.markModified('saves');
    
    await collection.save();
    console.log('Successfully deleted save. New saves count:', collection.saves.length);

    res.json({ 
      message: 'Save deleted successfully',
      success: true,
      deletedSave: {
        url: deletedSave.url,
        title: deletedSave.title,
        name: deletedSave.name
      }
    });
  } catch (error) {
    console.error('Error deleting save:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all seen saves across all collections for the current user
router.delete('/saves/seen/all', authMiddleware, async (req, res) => {
  try {
    console.log('Deleting all seen saves for user:', req.userId);
    
    const collections = await Collection.find({ userId: req.userId });
    let totalDeleted = 0;
    let modifiedCollections = [];

    for (const collection of collections) {
      if (!collection.saves || !Array.isArray(collection.saves)) continue;
      
      const originalLength = collection.saves.length;
      
      // Filter out seen saves
      collection.saves = collection.saves.filter(save => !save.seen);
      
      const deleted = originalLength - collection.saves.length;
      
      if (deleted > 0) {
        totalDeleted += deleted;
        collection.updatedAt = new Date();
        collection.markModified('saves');
        await collection.save();
        
        modifiedCollections.push({
          collectionId: collection.fbid,
          title: collection.title,
          deleted,
          remaining: collection.saves.length
        });
      }
    }

    res.json({
      message: `Successfully deleted ${totalDeleted} seen saves`,
      success: true,
      totalDeleted,
      modifiedCollections
    });
  } catch (error) {
    console.error('Error deleting seen saves:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an entire collection
router.delete('/collection/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    console.log('Deleting collection:', { itemId });

    if (!itemId) {
      return res.status(400).json({ error: 'Collection ID is required' });
    }

    // Find and delete the collection - verify it belongs to the user
    const collection = await Collection.findOneAndDelete({ 
      userId: req.userId,
      fbid: itemId 
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    console.log('Successfully deleted collection:', collection.title);

    res.json({ 
      message: 'Collection deleted successfully',
      success: true,
      deletedCollection: {
        title: collection.title,
        fbid: collection.fbid,
        savesCount: collection.saves?.length || 0
      }
    });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all items for the current user (for testing)
router.delete('/all', authMiddleware, async (req, res) => {
  try {
    await Collection.deleteMany({ userId: req.userId });
    res.json({ 
      message: 'All collections deleted for user',
      success: true 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;