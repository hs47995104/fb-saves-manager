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
      decoded[key] = decodeObjectStrings(obj[key], path ? `${path}.${key}` : key);
    }
    return decoded;
  }
  return obj;
}

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
      coverPhoto: null,
      rawData: collection
    };

    if (collection.label_values && Array.isArray(collection.label_values)) {
      collection.label_values.forEach((item) => {
        const itemType = item.label || item.title;
        
        // Handle Title
        if (item.label === 'Title') {
          result.title = item.value || 'Untitled Collection';
        }
        
        // Handle Description
        else if (item.label === 'Description') {
          result.description = item.value || '';
        }
        
        // Handle Last updated time
        else if (item.label === 'Last updated time') {
          result.lastUpdated = item.timestamp_value;
        }
        
        // Handle Participants
        else if (item.title === 'Participants' && item.dict) {
          result.participants = item.dict
            .map(p => {
              const nameField = p.dict?.find(f => f.label === 'Name');
              return nameField?.value || '';
            })
            .filter(name => name);
        }
        
        // Handle Saves
        else if (item.title === 'Saves' && item.dict) {
          result.saves = item.dict.map((saveWrapper) => {
            const saveFields = saveWrapper.dict || [];
            
            const urlField = saveFields.find(f => f.label === 'URL');
            const nameField = saveFields.find(f => f.label === 'Name');
            const titleField = saveFields.find(f => f.label === 'Title');
            const seenField = saveFields.find(f => f.label === 'Seen');
            
            // Extract group info
            const groupField = saveFields.find(f => f.dict && f.title === 'Group');
            let groupName = null;
            if (groupField && groupField.dict && groupField.dict[0]) {
              const groupDict = groupField.dict[0].dict || [];
              groupName = groupDict.find(f => f.label === 'Name')?.value || null;
            }
            
            // Extract author info
            const authorField = saveFields.find(f => f.dict && f.title === 'Author');
            let authorName = null;
            if (authorField && authorField.dict && authorField.dict[0]) {
              const authorDict = authorField.dict[0].dict || [];
              authorName = authorDict.find(f => f.label === 'Name')?.value || null;
            }
            
            const saveObj = {
              url: urlField?.value || '',
              href: urlField?.href || '',
              name: nameField?.value || '',
              title: titleField?.value || '',
              seen: seenField?.value === 'True',
              favorite: false,
              originalData: saveWrapper
            };
            
            if (groupName) saveObj.group = { name: groupName };
            if (authorName) saveObj.author = { name: authorName };
            
            return saveObj;
          }).filter(save => save.url);
        }
        
        // Handle Cover photo
        else if (item.label === 'Cover photo') {
          result.coverPhoto = item.media || null;
        }
      });
    }

    // If title is still empty, try to find it in other places
    if (!result.title && collection.title) {
      result.title = collection.title;
    }
    if (!result.title && collection.name) {
      result.title = collection.name;
    }

    console.log(`  📊 Collection: "${result.title}"`);
    console.log(`  - Participants: ${result.participants.length}`);
    console.log(`  - Saves: ${result.saves.length}`);
    
    return result;
  });
};

module.exports = { 
  parseSavedItems, 
  decodeUtf8Escapes, 
  decodeObjectStrings 
};