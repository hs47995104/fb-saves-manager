const { TextDecoder } = require('util');

/**
 * Decode UTF-8 bytes from mojibake or escaped sequences
 */
function decodeUtf8Escapes(str) {
  if (typeof str !== 'string') return str;
  
  try {
    // FIRST: Check for mojibake pattern (à§§à§¨ format) - most likely case
    if (str.match(/[à-ü][§-ÿ]/)) {
      console.log('Found mojibake pattern, recovering...');
      
      // Treat each character as a byte
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xFF);
      }
      
      try {
        const decoder = new TextDecoder('utf-8');
        const result = decoder.decode(new Uint8Array(bytes));
        if (result && result.length > 0) {
          console.log('✅ Mojibake recovery successful');
          return result;
        }
      } catch (e) {
        console.log('Mojibake recovery failed:', e.message);
      }
    }
    
    // SECOND: Check for escaped format (\u00e0\u00a7 format)
    if (str.includes('\\u00')) {
      console.log('Found \\u00 pattern, decoding...');
      
      const bytes = [];
      let i = 0;
      while (i < str.length) {
        if (str.substr(i, 6).match(/^\\u00[0-9a-f]{2}/i)) {
          const hex = str.substr(i + 2, 4);
          bytes.push(parseInt(hex, 16));
          i += 6;
        } else {
          bytes.push(str.charCodeAt(i));
          i++;
        }
      }
      
      const decoder = new TextDecoder('utf-8');
      const result = decoder.decode(new Uint8Array(bytes));
      if (result && result.length > 0) {
        console.log('✅ Escape decoding successful');
        return result;
      }
    }
    
    // THIRD: Check if it's already proper Unicode (contains Bengali characters)
    if (/[\u0980-\u09FF]/.test(str)) {
      // Already proper Bengali, return as is
      return str;
    }
    
    return str;
  } catch (error) {
    console.error('Error in decodeUtf8Escapes:', error);
    return str;
  }
}

/**
 * Recursively decode all string values in an object
 */
function decodeObjectStrings(obj, path = '') {
  if (typeof obj === 'string') {
    const decoded = decodeUtf8Escapes(obj);
    if (decoded !== obj) {
      console.log(`✅ Decoded at ${path}`);
    }
    return decoded;
  } else if (Array.isArray(obj)) {
    return obj.map((item, index) => decodeObjectStrings(item, `${path}[${index}]`));
  } else if (obj && typeof obj === 'object') {
    const decoded = {};
    for (const key in obj) {
      // Skip decoding for large binary-like fields if needed
      if (key === 'media' || key === 'uri' || key === 'photo') {
        decoded[key] = obj[key]; // Keep as is, likely binary references
      } else {
        decoded[key] = decodeObjectStrings(obj[key], path ? `${path}.${key}` : key);
      }
    }
    return decoded;
  }
  return obj;
}

/**
 * Categorize a URL based on known Facebook patterns
 * Returns one of: 'video', 'reel', 'group_post', 'post', 'link', 'unknown'
 */
function categorizeUrl(url) {
  if (!url || typeof url !== 'string') return 'unknown';

  const patterns = [
    { type: 'video', regex: /facebook\.com\/.*\/videos\//i },
    { type: 'video', regex: /fb\.watch\//i },
    { type: 'video', regex: /facebook\.com\/watch\?v=/i },
    { type: 'video', regex: /facebook\.com\/video\.php\?v=/i },
    { type: 'video', regex: /web\.facebook\.com\/.*\/videos\//i },
    
    { type: 'reel', regex: /facebook\.com\/reel\//i },
    { type: 'reel', regex: /fb\.com\/reel\//i },
    
    { type: 'group_post', regex: /facebook\.com\/groups\/.*\/posts\//i },
    { type: 'group_post', regex: /facebook\.com\/groups\/.*\/permalink\//i },
    { type: 'group_post', regex: /facebook\.com\/groups\/[^/]+\/?$/i }, // group main page
    
    { type: 'post', regex: /facebook\.com\/.*\/posts\//i },
    { type: 'post', regex: /facebook\.com\/story\.php\?story_fbid=/i },
    { type: 'post', regex: /facebook\.com\/permalink\.php\?story_fbid=/i },
    { type: 'post', regex: /facebook\.com\/[^/]+\/activity\//i },
    
    { type: 'photo', regex: /facebook\.com\/photo\.php\?fbid=/i },
    { type: 'photo', regex: /facebook\.com\/[^/]+\/photos\//i },
    
    { type: 'link', regex: /^https?:\/\//i } // any external link not matching above
  ];

  for (const { type, regex } of patterns) {
    if (regex.test(url)) return type;
  }
  
  return 'unknown';
}

/**
 * Extract value from a field that might be in different formats
 */
function extractFieldValue(field) {
  if (!field) return '';
  
  // Direct value
  if (field.value !== undefined) return field.value;
  
  // Timestamp value
  if (field.timestamp_value !== undefined) return field.timestamp_value;
  
  // Media value
  if (field.media) return field.media;
  
  // Dict with name field
  if (field.dict && Array.isArray(field.dict)) {
    for (const item of field.dict) {
      if (item.label === 'Name' && item.value) return item.value;
    }
  }
  
  return '';
}

/**
 * Parse a Facebook saved_items.json array into our internal format.
 * Each collection in the output contains:
 *   timestamp, fbid, title, description, lastUpdated, participants, saves
 */
const parseSavedItems = (jsonData) => {
  console.log('🔍 Parser started');
  
  // Parse the JSON first
  let parsed;
  try {
    parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    console.log('✅ JSON parsed successfully');
  } catch (error) {
    console.error('❌ JSON parse error:', error);
    throw new Error('Invalid JSON format');
  }
  
  if (!Array.isArray(parsed)) {
    throw new Error('Expected array of collections');
  }

  console.log(`📊 Found ${parsed.length} collections to process`);

  // Decode all strings in the parsed data
  const decodedData = decodeObjectStrings(parsed, 'root');

  return decodedData.map((collection, collectionIndex) => {
    console.log(`\n--- Processing collection ${collectionIndex + 1}: ${collection.fbid || 'unknown'} ---`);
    
    const result = {
      timestamp: collection.timestamp,
      fbid: collection.fbid,
      title: '',
      description: '',
      lastUpdated: null,
      participants: [],
      saves: [],
      coverPhoto: null
      // rawData intentionally removed to save storage
    };

    if (!collection.label_values || !Array.isArray(collection.label_values)) {
      console.log('  ⚠️ No label_values found');
      return result;
    }

    // Build a map of label/title → field object for O(1) access
    const fieldMap = new Map();
    for (const item of collection.label_values) {
      if (item.label) {
        fieldMap.set(item.label, item);
      } else if (item.title) {
        fieldMap.set(item.title, item);
      }
    }

    // Title
    const titleField = fieldMap.get('Title');
    if (titleField) {
      result.title = extractFieldValue(titleField) || 'Untitled Collection';
    }

    // Description
    const descField = fieldMap.get('Description');
    if (descField) {
      result.description = extractFieldValue(descField) || '';
    }

    // Last updated time
    const lastUpdatedField = fieldMap.get('Last updated time');
    if (lastUpdatedField && lastUpdatedField.timestamp_value) {
      result.lastUpdated = lastUpdatedField.timestamp_value;
    }

    // Participants
    const participantsField = fieldMap.get('Participants');
    if (participantsField && participantsField.dict && Array.isArray(participantsField.dict)) {
      result.participants = participantsField.dict
        .map(p => {
          if (!p.dict) return '';
          const nameField = p.dict.find(f => f.label === 'Name');
          return nameField?.value || '';
        })
        .filter(name => name && name.trim() !== '');
    }

    // Cover photo
    const coverField = fieldMap.get('Cover photo');
    if (coverField) {
      result.coverPhoto = coverField.media || coverField.value || null;
    }

    // Saves - the most important part
    const savesField = fieldMap.get('Saves');
    if (savesField && savesField.dict && Array.isArray(savesField.dict)) {
      result.saves = savesField.dict.map((saveWrapper, saveIndex) => {
        if (!saveWrapper.dict || !Array.isArray(saveWrapper.dict)) return null;

        // Build a map for this save's fields
        const saveFieldMap = new Map();
        for (const field of saveWrapper.dict) {
          if (field.label) {
            saveFieldMap.set(field.label, field);
          }
        }

        const url = saveFieldMap.get('URL')?.value || '';
        
        // Skip saves without URLs
        if (!url) return null;

        const name = saveFieldMap.get('Name')?.value || '';
        const title = saveFieldMap.get('Title')?.value || '';
        
        // Extract group info
        let groupName = null;
        const groupField = saveWrapper.dict.find(f => f.dict && f.title === 'Group');
        if (groupField && groupField.dict && groupField.dict[0]) {
          const groupDict = groupField.dict[0].dict || [];
          const groupNameField = groupDict.find(f => f.label === 'Name');
          groupName = groupNameField?.value || null;
        }
        
        // Extract author info
        let authorName = null;
        const authorField = saveWrapper.dict.find(f => f.dict && f.title === 'Author');
        if (authorField && authorField.dict && authorField.dict[0]) {
          const authorDict = authorField.dict[0].dict || [];
          const authorNameField = authorDict.find(f => f.label === 'Name');
          authorName = authorNameField?.value || null;
        }

        // Extract media type hint if available
        const mediaField = saveWrapper.dict.find(f => f.media);
        const mediaType = mediaField?.media?.__typename || null;

        const saveObj = {
          url: url,
          href: saveFieldMap.get('URL')?.href || '',
          name: name,
          title: title,
          seen: false, // Force unseen for all new imports
          favorite: false,
          type: categorizeUrl(url), // Auto-categorize based on URL
          mediaType: mediaType, // Store Facebook's media type if available
          itemId: `item_${Date.now()}_${collectionIndex}_${saveIndex}_${Math.random().toString(36).substr(2, 6)}` // Unique ID for future reference
        };
        
        if (groupName) {
          saveObj.group = { name: groupName };
        }
        
        if (authorName) {
          saveObj.author = { name: authorName };
        }
        
        return saveObj;
      }).filter(save => save !== null); // Remove null entries
    }

    console.log(`  📊 Collection: "${result.title || 'Untitled'}"`);
    console.log(`  - Participants: ${result.participants.length}`);
    console.log(`  - Saves: ${result.saves.length}`);
    
    // Log type distribution
    const typeCount = {};
    result.saves.forEach(save => {
      typeCount[save.type] = (typeCount[save.type] || 0) + 1;
    });
    if (Object.keys(typeCount).length > 0) {
      console.log('  - Types:', Object.entries(typeCount).map(([t, c]) => `${t}:${c}`).join(', '));
    }
    
    return result;
  });
};

/**
 * Categorize a URL based on known patterns
 * Returns one of: 'video', 'reel', 'group_post', 'post', 'photo', 'link', 'unknown'
 */
function categorizeUrl(url) {
  if (!url || typeof url !== 'string') return 'unknown';

  const patterns = [
    // Video platforms
    { type: 'video', regex: /youtube\.com\/watch\?v=/i },
    { type: 'video', regex: /youtu\.be\//i },
    { type: 'video', regex: /youtube\.com\/shorts\//i },
    { type: 'video', regex: /vimeo\.com\//i },
    { type: 'video', regex: /dailymotion\.com\/video\//i },
    { type: 'video', regex: /twitch\.tv\/videos\//i },
    { type: 'video', regex: /tiktok\.com\/@.+\/video\//i },
    
    // Facebook videos
    { type: 'video', regex: /facebook\.com\/.*\/videos\//i },
    { type: 'video', regex: /fb\.watch\//i },
    { type: 'video', regex: /facebook\.com\/watch\?v=/i },
    { type: 'video', regex: /facebook\.com\/video\.php\?v=/i },
    
    // Reels/Shorts (short-form video)
    { type: 'reel', regex: /facebook\.com\/reel\//i },
    { type: 'reel', regex: /instagram\.com\/reel\//i },
    { type: 'reel', regex: /youtube\.com\/shorts\//i },
    { type: 'reel', regex: /tiktok\.com\//i },
    
    // Instagram
    { type: 'video', regex: /instagram\.com\/p\//i },
    { type: 'video', regex: /instagram\.com\/tv\//i },
    
    // Facebook posts
    { type: 'post', regex: /facebook\.com\/.*\/posts\//i },
    { type: 'post', regex: /facebook\.com\/story\.php\?story_fbid=/i },
    
    // Facebook groups
    { type: 'group_post', regex: /facebook\.com\/groups\/.*\/posts\//i },
    
    // Photos
    { type: 'photo', regex: /facebook\.com\/photo\.php\?fbid=/i },
    { type: 'photo', regex: /facebook\.com\/.*\/photos\//i },
    
    { type: 'link', regex: /^https?:\/\//i }
  ];

  for (const { type, regex } of patterns) {
    if (regex.test(url)) return type;
  }
  
  return 'unknown';
}

module.exports = { 
  parseSavedItems, 
  decodeUtf8Escapes, 
  decodeObjectStrings,
  categorizeUrl // Export for use elsewhere
};