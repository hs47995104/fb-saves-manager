// frontend/src/utils/duplicateDetector.js - URL-based duplicate detection

/**
 * Normalize a URL for comparison
 * - Remove trailing slashes
 * - Convert to lowercase
 * - Remove common tracking parameters
 */
const normalizeUrl = (url) => {
  if (!url) return '';
  
  try {
    // Handle relative URLs or malformed URLs gracefully
    let urlStr = url.toLowerCase().trim();
    
    // Remove trailing slash
    urlStr = urlStr.replace(/\/$/, '');
    
    // Try to parse as URL to remove query params and hash
    try {
      const urlObj = new URL(urlStr);
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'];
      trackingParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.delete(param);
        }
      });
      
      // Remove hash fragment
      urlObj.hash = '';
      
      return urlObj.toString().toLowerCase();
    } catch {
      // If URL parsing fails, return cleaned string
      return urlStr;
    }
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url;
  }
};

/**
 * Detect duplicates based solely on URLs
 */
export const detectDuplicates = (collections) => {
  if (!collections || collections.length === 0) {
    return { duplicateMap: new Map() };
  }

  // Sort collections by size (largest first) - original will be in largest collection
  const sortedCollections = [...collections].sort((a, b) => 
    (b.saves?.length || 0) - (a.saves?.length || 0)
  );

  const urlMap = new Map(); // normalized URL -> { collectionId, saveIndex, item }
  const duplicateMap = new Map(); // key -> duplicate info

  sortedCollections.forEach(collection => {
    if (!collection.saves) return;

    collection.saves.forEach((save, index) => {
      if (!save.url) return; // Skip items without URLs

      const normalizedUrl = normalizeUrl(save.url);
      const itemKey = `${collection.fbid}-${index}`;

      if (urlMap.has(normalizedUrl)) {
        // This is a duplicate
        const original = urlMap.get(normalizedUrl);
        
        duplicateMap.set(itemKey, {
          isDuplicate: true,
          isOriginal: false,
          originalCollectionId: original.collectionId,
          originalCollectionTitle: original.collectionTitle,
          originalIndex: original.index,
          url: normalizedUrl
        });
      } else {
        // This is the first occurrence (original)
        urlMap.set(normalizedUrl, {
          collectionId: collection.fbid,
          collectionTitle: collection.title || 'Untitled Collection',
          index,
          item: save
        });
        
        duplicateMap.set(itemKey, {
          isDuplicate: false,
          isOriginal: true,
          url: normalizedUrl
        });
      }
    });
  });

  // Add duplicate count to originals
  urlMap.forEach((original, url) => {
    // Count how many duplicates exist for this URL
    let duplicateCount = 0;
    duplicateMap.forEach((info, key) => {
      if (info.url === url && info.isDuplicate) {
        duplicateCount++;
      }
    });

    // Update original item with duplicate count
    const originalKey = `${original.collectionId}-${original.index}`;
    if (duplicateMap.has(originalKey)) {
      duplicateMap.set(originalKey, {
        ...duplicateMap.get(originalKey),
        duplicateCount
      });
    }
  });

  return { duplicateMap };
};

/**
 * Check if an item is a duplicate
 */
export const isDuplicate = (collectionId, saveIndex, duplicateMap) => {
  const key = `${collectionId}-${saveIndex}`;
  return duplicateMap.get(key)?.isDuplicate || false;
};

/**
 * Get duplicate information for an item
 */
export const getDuplicateInfo = (collectionId, saveIndex, duplicateMap) => {
  const key = `${collectionId}-${saveIndex}`;
  return duplicateMap.get(key);
};

/**
 * Filter items based on duplicate settings
 */
export const filterItemsByDuplicateSettings = (items, duplicateMap, showDuplicates = false) => {
  if (showDuplicates) {
    return items;
  }
  
  return items.filter(item => {
    const key = `${item.parentFbid || item.parentId}-${item.saveIndex}`;
    const dupInfo = duplicateMap.get(key);
    return !dupInfo?.isDuplicate;
  });
};

/**
 * Get all duplicates grouped by original item
 */
export const getDuplicatesByOriginal = (collections, duplicateMap) => {
  const groupedDuplicates = new Map();
  
  // First, collect all originals with their duplicates
  duplicateMap.forEach((info, key) => {
    if (info.isDuplicate && info.url) {
      const originalKey = `${info.originalCollectionId}-${info.originalIndex}`;
      
      if (!groupedDuplicates.has(originalKey)) {
        groupedDuplicates.set(originalKey, {
          originalCollectionId: info.originalCollectionId,
          originalIndex: info.originalIndex,
          url: info.url,
          duplicates: []
        });
      }
      
      // Find the actual item data
      const [collectionId, indexStr] = key.split('-');
      const index = parseInt(indexStr, 10);
      const collection = collections.find(c => c.fbid === collectionId);
      const item = collection?.saves?.[index];
      
      if (item) {
        groupedDuplicates.get(originalKey).duplicates.push({
          collectionId,
          saveIndex: index,
          item,
          collectionTitle: collection?.title || 'Unknown Collection'
        });
      }
    }
  });
  
  return groupedDuplicates;
};

/**
 * Get duplicate statistics
 */
export const getDuplicateStats = (collections, duplicateMap) => {
  let totalDuplicates = 0;
  const collectionStats = new Map();
  
  duplicateMap.forEach((info, key) => {
    if (info.isDuplicate) {
      totalDuplicates++;
      
      const [collectionId] = key.split('-');
      if (!collectionStats.has(collectionId)) {
        collectionStats.set(collectionId, 0);
      }
      collectionStats.set(collectionId, collectionStats.get(collectionId) + 1);
    }
  });
  
  return {
    totalDuplicates,
    collectionStats
  };
};