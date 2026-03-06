const generateItemKey = (item, fields = ['url', 'title', 'name']) => {
  const parts = [];
  
  if (fields.includes('url') && item.url) {
    const normalizedUrl = item.url
      .split('?')[0]
      .replace(/\/$/, '')
      .toLowerCase();
    parts.push(`url:${normalizedUrl}`);
  }
  
  if (fields.includes('title') && item.title) {
    parts.push(`title:${item.title.toLowerCase().trim()}`);
  }
  
  if (fields.includes('name') && item.name) {
    parts.push(`name:${item.name.toLowerCase().trim()}`);
  }
  
  if (parts.length === 0) {
    if (item.url) parts.push(`url:${item.url.toLowerCase()}`);
    else if (item.title) parts.push(`title:${item.title.toLowerCase()}`);
    else if (item.name) parts.push(`name:${item.name.toLowerCase()}`);
    else parts.push(`unknown:${Date.now()}`);
  }
  
  return parts.join('|');
};

export const detectDuplicates = (collections, settings) => {
  if (!collections || collections.length === 0) {
    return { duplicateMap: new Map(), itemKeyMap: new Map() };
  }

  const { prioritizeBySize = true, duplicateMatchFields = ['url', 'title', 'name'] } = settings;
  
  const sortedCollections = prioritizeBySize
    ? [...collections].sort((a, b) => (b.saves?.length || 0) - (a.saves?.length || 0))
    : collections;

  const itemKeyMap = new Map();
  const duplicateMap = new Map();
  const collectionSizes = new Map();
  const collectionTitles = new Map();

  collections.forEach(collection => {
    collectionSizes.set(collection.fbid, collection.saves?.length || 0);
    collectionTitles.set(collection.fbid, collection.title || 'Untitled Collection');
  });

  sortedCollections.forEach(collection => {
    if (!collection.saves) return;

    collection.saves.forEach((save, index) => {
      const itemKey = generateItemKey(save, duplicateMatchFields);
      
      if (itemKeyMap.has(itemKey)) {
        const originalInfo = itemKeyMap.get(itemKey);
        
        if (!originalInfo.duplicateLocations) {
          originalInfo.duplicateLocations = [];
        }
        
        originalInfo.duplicateLocations.push({
          collectionId: collection.fbid,
          collectionTitle: collection.title || 'Untitled Collection',
          saveIndex: index,
          item: save
        });
        
        originalInfo.duplicateCount = (originalInfo.duplicateCount || 0) + 1;
        
        itemKeyMap.set(itemKey, originalInfo);
        
        duplicateMap.set(`${collection.fbid}-${index}`, {
          isDuplicate: true,
          isOriginal: false,
          originalCollectionId: originalInfo.collectionId,
          originalCollectionTitle: originalInfo.collectionTitle,
          originalCollectionSize: collectionSizes.get(originalInfo.collectionId) || 0,
          originalIndex: originalInfo.index,
          key: itemKey,
          duplicateCount: originalInfo.duplicateCount,
          totalDuplicates: originalInfo.duplicateCount,
          duplicateLocations: originalInfo.duplicateLocations || []
        });
      } else {
        itemKeyMap.set(itemKey, {
          collectionId: collection.fbid,
          collectionTitle: collection.title || 'Untitled Collection',
          index,
          duplicateCount: 0,
          duplicateLocations: []
        });
        
        duplicateMap.set(`${collection.fbid}-${index}`, {
          isDuplicate: false,
          isOriginal: true,
          key: itemKey,
          duplicateCount: 0,
          duplicateLocations: []
        });
      }
    });
  });

  itemKeyMap.forEach((info, key) => {
    if (info.duplicateCount > 0) {
      duplicateMap.set(`${info.collectionId}-${info.index}`, {
        isDuplicate: false,
        isOriginal: true,
        key,
        duplicateCount: info.duplicateCount,
        totalDuplicates: info.duplicateCount,
        duplicateLocations: info.duplicateLocations || []
      });

      (info.duplicateLocations || []).forEach(loc => {
        const dupKey = `${loc.collectionId}-${loc.saveIndex}`;
        const existing = duplicateMap.get(dupKey) || {};
        duplicateMap.set(dupKey, {
          ...existing,
          isDuplicate: true,
          isOriginal: false,
          originalCollectionId: info.collectionId,
          originalCollectionTitle: info.collectionTitle,
          originalIndex: info.index,
          key,
          duplicateCount: info.duplicateCount,
          totalDuplicates: info.duplicateCount,
          duplicateLocations: info.duplicateLocations || []
        });
      });
    }
  });

  return { 
    duplicateMap,
    itemKeyMap 
  };
};

export const isDuplicate = (collectionId, saveIndex, duplicateMap) => {
  const key = `${collectionId}-${saveIndex}`;
  return duplicateMap.get(key)?.isDuplicate || false;
};

export const getDuplicateInfo = (collectionId, saveIndex, duplicateMap) => {
  const key = `${collectionId}-${saveIndex}`;
  return duplicateMap.get(key);
};

export const formatDuplicateLocations = (duplicateLocations, currentCollectionId = null, maxDisplay = 3) => {
  if (!duplicateLocations || duplicateLocations.length === 0) {
    return '';
  }
  
  const locations = currentCollectionId 
    ? duplicateLocations.filter(loc => loc.collectionId !== currentCollectionId)
    : duplicateLocations;
  
  if (locations.length === 0) return '';
  
  const collectionCounts = new Map();
  locations.forEach(loc => {
    const count = collectionCounts.get(loc.collectionTitle) || 0;
    collectionCounts.set(loc.collectionTitle, count + 1);
  });
  
  const parts = [];
  let count = 0;
  
  for (const [collectionTitle, itemCount] of collectionCounts) {
    if (count >= maxDisplay) break;
    if (itemCount === 1) {
      parts.push(`"${collectionTitle}"`);
    } else {
      parts.push(`"${collectionTitle}" (${itemCount})`);
    }
    count++;
  }
  
  const remaining = locations.length - parts.length;
  
  if (remaining > 0) {
    if (parts.length === 0) {
      return `in ${remaining} other location${remaining > 1 ? 's' : ''}`;
    } else {
      return `${parts.join(', ')} and ${remaining} more`;
    }
  }
  
  return parts.join(', ');
};

export const filterItemsByDuplicateSettings = (items, duplicateMap, settings) => {
  const { showDuplicates = false } = settings;
  
  if (showDuplicates) {
    return items;
  }
  
  return items.filter(item => {
    const key = `${item.parentFbid || item.parentId}-${item.saveIndex}`;
    const dupInfo = duplicateMap.get(key);
    return !dupInfo?.isDuplicate;
  });
};

export const getDuplicatesByOriginal = (collections, duplicateMap) => {
  const groupedDuplicates = new Map();
  
  duplicateMap.forEach((info, key) => {
    if (info.isDuplicate && info.originalCollectionId) {
      const originalKey = `${info.originalCollectionId}-${info.originalIndex}`;
      if (!groupedDuplicates.has(originalKey)) {
        groupedDuplicates.set(originalKey, []);
      }
      
      const collection = collections.find(c => c.fbid === info.originalCollectionId);
      if (collection && collection.saves && collection.saves[info.originalIndex]) {
        groupedDuplicates.get(originalKey).push({
          ...info,
          item: collection.saves[info.originalIndex],
          collectionId: info.originalCollectionId,
          saveIndex: info.originalIndex
        });
      }
    }
  });
  
  return groupedDuplicates;
};