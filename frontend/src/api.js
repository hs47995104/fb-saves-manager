import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

// Add token to requests if it exists
api.interceptors.request.use(request => {
  const token = localStorage.getItem('token');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  console.log('Starting Request:', request.method, request.url);
  return request;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout. The file might be too large.'));
    }
    
    if (!error.response) {
      if (error.message.includes('Network Error')) {
        return Promise.reject(new Error('Network error. Please check:\n' +
          '1. Backend server is running\n' +
          '2. CORS is properly configured\n' +
          '3. You have internet connection'));
      }
      return Promise.reject(new Error(`Network error: ${error.message}`));
    }

    const message = error.response.data?.error || 
                    error.response.data?.message || 
                    `Server error: ${error.response.status}`;
    
    return Promise.reject(new Error(message));
  }
);

const safeString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.name && typeof value.name === 'string') return value.name;
    if (value.value && typeof value.value === 'string') return value.value;
    if (value.title && typeof value.title === 'string') return value.title;
    return JSON.stringify(value);
  }
  return String(value);
};

const transformSave = (save) => {
  if (!save) return save;
  return {
    ...save,
    name: safeString(save.name),
    title: safeString(save.title),
    url: save.url || '',
    href: save.href || '',
    seen: Boolean(save.seen),
    favorite: Boolean(save.favorite),
    group: save.group ? safeString(save.group) : null,
    author: save.author ? safeString(save.author) : null
  };
};

const transformCollection = (collection) => {
  if (!collection) return collection;
  return {
    ...collection,
    title: safeString(collection.title),
    description: safeString(collection.description),
    saves: (collection.saves || []).map(transformSave),
    participants: (collection.participants || []).map(p => safeString(p))
  };
};

export const getItems = async (page = 1, limit = 20) => {
  try {
    const response = await api.get(`/items?page=${page}&limit=${limit}`);
    if (response.data.items) {
      response.data.items = response.data.items.map(transformCollection);
    }
    return response;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
};

export const getAllItems = async () => {
  try {
    const response = await api.get('/items/all');
    if (Array.isArray(response.data)) {
      response.data = response.data.map(transformCollection);
    }
    return response;
  } catch (error) {
    console.error('Error fetching all items:', error);
    throw error;
  }
};

export const getSaves = async (page = 1, limit = 50) => {
  try {
    const response = await api.get(`/items/saves?page=${page}&limit=${limit}`);
    if (response.data.items && Array.isArray(response.data.items)) {
      response.data.items = response.data.items.map(item => ({
        ...item,
        save: transformSave(item.save)
      }));
    }
    return response;
  } catch (error) {
    console.error('Error fetching saves:', error);
    throw error;
  }
};

export const uploadJSON = async (jsonData) => {
  try {
    let parsed;
    try {
      parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    } catch (e) {
      throw new Error('Invalid JSON format');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array');
    }

    const sizeMB = (jsonData.length / (1024 * 1024)).toFixed(2);
    console.log(`Uploading ${sizeMB}MB file with ${parsed.length} items`);

    const response = await api.post('/items/upload', { jsonData });
    return response;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const updateSeen = async (itemId, saveIndex, seen) => {
  try {
    console.log('API: Updating seen:', { itemId, saveIndex, seen });
    
    if (!itemId) {
      throw new Error('Item ID is required');
    }
    
    if (saveIndex === undefined || saveIndex === null) {
      throw new Error('Save index is required');
    }
    
    const response = await api.patch(`/items/save/${itemId}/${saveIndex}/seen`, { seen });
    console.log('API: Update seen response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update seen status');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error updating seen status:', error);
    throw error;
  }
};

export const deleteSave = async (itemId, saveIndex) => {
  try {
    console.log('API: Deleting save:', { itemId, saveIndex });
    
    if (!itemId) {
      throw new Error('Item ID is required');
    }
    
    if (saveIndex === undefined || saveIndex === null) {
      throw new Error('Save index is required');
    }
    
    const response = await api.delete(`/items/save/${itemId}/${saveIndex}`);
    console.log('API: Delete save response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete save');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error deleting save:', error);
    throw error;
  }
};

export const deleteCollection = async (itemId) => {
  try {
    console.log('API: Deleting collection:', { itemId });
    
    if (!itemId) {
      throw new Error('Collection ID is required');
    }
    
    const response = await api.delete(`/items/collection/${itemId}`);
    console.log('API: Delete collection response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete collection');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error deleting collection:', error);
    throw error;
  }
};

export const bulkDeleteSaves = async (deleteCriteria) => {
  try {
    console.log('API: Bulk deleting saves:', deleteCriteria);
    
    const response = await api.post('/items/saves/bulk-delete', deleteCriteria);
    console.log('API: Bulk delete response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to bulk delete saves');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error in bulk delete:', error);
    throw error;
  }
};

export const deleteAllSeen = async () => {
  try {
    console.log('API: Deleting all seen items');
    
    const response = await api.delete('/items/saves/seen/all');
    console.log('API: Delete all seen response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete seen items');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error deleting seen items:', error);
    throw error;
  }
};

export const createCollection = async (title, description = '') => {
  try {
    console.log('API: Creating collection:', { title, description });
    
    const response = await api.post('/items/collections', { title, description });
    console.log('API: Create collection response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create collection');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error creating collection:', error);
    throw error;
  }
};

export const moveItem = async (sourceCollectionId, targetCollectionId, saveIndex, itemId = null) => {
  try {
    console.log('API: Moving item:', { sourceCollectionId, targetCollectionId, saveIndex, itemId });
    
    const response = await api.post('/items/items/move', {
      sourceCollectionId,
      targetCollectionId,
      saveIndex,
      itemId
    });
    
    console.log('API: Move item response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to move item');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error moving item:', error);
    throw error;
  }
};

export const getSimpleCollections = async () => {
  try {
    const response = await api.get('/items/collections/simple');
    return response;
  } catch (error) {
    console.error('API: Error fetching simple collections:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    const response = await api.get('/items/stats');
    return response;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

export const deleteAll = async () => {
  try {
    const response = await api.delete('/items/all');
    return response;
  } catch (error) {
    console.error('Error deleting all items:', error);
    throw error;
  }
};

export const updateFavorite = async (itemId, saveIndex, favorite) => {
  try {
    console.log('API: Updating favorite:', { itemId, saveIndex, favorite });
    
    if (!itemId) {
      throw new Error('Item ID is required');
    }
    
    if (saveIndex === undefined || saveIndex === null) {
      throw new Error('Save index is required');
    }
    
    const response = await api.patch(`/items/save/${itemId}/${saveIndex}/favorite`, { favorite });
    console.log('API: Update favorite response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update favorite status');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error updating favorite status:', error);
    throw error;
  }
};

export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return response;
  } catch (error) {
    console.error('Connection test failed:', error);
    return null;
  }
};

export const getAllTags = async () => {
  try {
    const response = await api.get('/tags/all');
    return response;
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
};

export const addTag = async (collectionId, saveIndex, tag) => {
  try {
    console.log('API: Adding tag:', { collectionId, saveIndex, tag });
    
    if (!collectionId || saveIndex === undefined || !tag) {
      throw new Error('Collection ID, save index, and tag are required');
    }
    
    const response = await api.post('/tags/add', {
      collectionId,
      saveIndex,
      tag
    });
    
    console.log('API: Add tag response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add tag');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error adding tag:', error);
    throw error;
  }
};

export const removeTag = async (collectionId, saveIndex, tagName) => {
  try {
    console.log('API: Removing tag:', { collectionId, saveIndex, tagName });
    
    if (!collectionId || saveIndex === undefined || !tagName) {
      throw new Error('Collection ID, save index, and tag name are required');
    }
    
    const response = await api.delete('/tags/remove', {
      data: { collectionId, saveIndex, tagName }
    });
    
    console.log('API: Remove tag response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove tag');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error removing tag:', error);
    throw error;
  }
};

export const updateTagColor = async (tagName, color) => {
  try {
    console.log('API: Updating tag color:', { tagName, color });
    
    const response = await api.patch('/tags/color', { tagName, color });
    
    console.log('API: Update tag color response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update tag color');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error updating tag color:', error);
    throw error;
  }
};

export const getItemsByTag = async (tagName, page = 1, limit = 50) => {
  try {
    const response = await api.get(`/tags/items/${encodeURIComponent(tagName)}?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching items by tag:', error);
    throw error;
  }
};

export const addComment = async (collectionId, saveIndex, text) => {
  try {
    console.log('API: Adding comment:', { collectionId, saveIndex, text });
    
    if (!collectionId || saveIndex === undefined || !text) {
      throw new Error('Collection ID, save index, and comment text are required');
    }
    
    const response = await api.post('/comments/add', {
      collectionId,
      saveIndex,
      text
    });
    
    console.log('API: Add comment response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add comment');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error adding comment:', error);
    throw error;
  }
};

export const updateComment = async (collectionId, saveIndex, commentIndex, text) => {
  try {
    console.log('API: Updating comment:', { collectionId, saveIndex, commentIndex, text });
    
    if (!collectionId || saveIndex === undefined || commentIndex === undefined || !text) {
      throw new Error('Collection ID, save index, comment index, and text are required');
    }
    
    const response = await api.patch('/comments/update', {
      collectionId,
      saveIndex,
      commentIndex,
      text
    });
    
    console.log('API: Update comment response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update comment');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error updating comment:', error);
    throw error;
  }
};

// Get recently seen items
export const getRecentlySeen = async (page = 1, limit = 50) => {
  try {
    const response = await api.get(`/items/saves/seen/recent?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching recently seen items:', error);
    throw error;
  }
};

export const deleteComment = async (collectionId, saveIndex, commentIndex) => {
  try {
    console.log('API: Deleting comment:', { collectionId, saveIndex, commentIndex });
    
    if (!collectionId || saveIndex === undefined || commentIndex === undefined) {
      throw new Error('Collection ID, save index, and comment index are required');
    }
    
    const response = await api.delete('/comments/delete', {
      data: { collectionId, saveIndex, commentIndex }
    });
    
    console.log('API: Delete comment response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete comment');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error deleting comment:', error);
    throw error;
  }
};

export const getItemComments = async (collectionId, saveIndex) => {
  try {
    console.log('API: Getting comments for item:', { collectionId, saveIndex });
    
    const response = await api.get(`/comments/item/${collectionId}/${saveIndex}`);
    
    return response;
  } catch (error) {
    console.error('API: Error fetching comments:', error);
    throw error;
  }
};

export const bulkUpdateSeen = async (collectionId, saveIndices, seen) => {
  try {
    console.log('API: Bulk updating seen:', { collectionId, saveIndices, seen });
    
    const response = await api.patch('/items/saves/seen/bulk', {
      collectionId,
      saveIndices,
      seen
    });
    
    console.log('API: Bulk update seen response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update seen status');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error bulk updating seen status:', error);
    throw error;
  }
};

export const bulkUpdateFavorite = async (collectionId, saveIndices, favorite) => {
  try {
    console.log('API: Bulk updating favorite:', { collectionId, saveIndices, favorite });
    
    const response = await api.patch('/items/saves/favorite/bulk', {
      collectionId,
      saveIndices,
      favorite
    });
    
    console.log('API: Bulk update favorite response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update favorite status');
    }
    
    return response;
  } catch (error) {
    console.error('API: Error bulk updating favorite status:', error);
    throw error;
  }
};

export default api;