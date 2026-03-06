import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiHash, FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { addTag, removeTag, getAllTags } from '../api';
import './Styles.css';

const TagManager = ({ collectionId, saveIndex, tags = [], onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editColor, setEditColor] = useState('#3498db');

  const predefinedColors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', 
    '#e67e22', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad',
    '#2c3e50', '#d35400', '#c0392b'
  ];

  useEffect(() => {
    loadSuggestedTags();
  }, []);

  const loadSuggestedTags = async () => {
    try {
      const response = await getAllTags();
      const existingTagNames = tags.map(t => t.name.toLowerCase());
      const suggestions = response.data.tags.filter(
        t => !existingTagNames.includes(t.name.toLowerCase())
      ).slice(0, 5);
      setSuggestedTags(suggestions);
    } catch (error) {
      console.error('Failed to load suggested tags:', error);
    }
  };

  const handleAddTag = async (tagName = newTag, tagColor = '#3498db') => {
    if (!tagName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await addTag(collectionId, saveIndex, {
        name: tagName.trim(),
        color: tagColor
      });
      
      toast.success('Tag added');
      setNewTag('');
      setIsAdding(false);
      
      if (onUpdate) {
        await onUpdate();
      }
      
      await loadSuggestedTags();
    } catch (error) {
      toast.error(error.message || 'Failed to add tag');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagName) => {
    setLoading(true);
    try {
      await removeTag(collectionId, saveIndex, tagName);
      toast.success('Tag removed');
      
      if (onUpdate) {
        await onUpdate();
      }
      
      await loadSuggestedTags();
    } catch (error) {
      toast.error(error.message || 'Failed to remove tag');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && newTag.trim()) {
      handleAddTag();
    }
  };

  return (
    <div className="tag-manager">
      <div className="tags-list">
        {tags.map((tag, index) => (
          <div 
            key={index} 
            className="tag"
            style={{ backgroundColor: tag.color || '#3498db' }}
          >
            <FiHash className="tag-icon" />
            <span className="tag-name">{tag.name}</span>
            <button
              className="remove-tag"
              onClick={() => handleRemoveTag(tag.name)}
              disabled={loading}
              title="Remove tag"
            >
              <FiX size={12} />
            </button>
          </div>
        ))}
        
        {!isAdding ? (
          <button
            className="add-tag-btn"
            onClick={() => setIsAdding(true)}
            disabled={loading}
          >
            <FiPlus /> Add Tag
          </button>
        ) : (
          <div className="add-tag-form">
            <div className="tag-input-wrapper">
              <FiHash className="input-icon" />
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter tag name"
                autoFocus
                disabled={loading}
                className="tag-input"
              />
              <button
                className="save-tag-btn"
                onClick={() => handleAddTag()}
                disabled={loading || !newTag.trim()}
              >
                Add
              </button>
              <button
                className="cancel-tag-btn"
                onClick={() => {
                  setIsAdding(false);
                  setNewTag('');
                }}
                disabled={loading}
              >
                <FiX />
              </button>
            </div>
            
            {suggestedTags.length > 0 && (
              <div className="suggested-tags">
                <span className="suggested-label">Suggested:</span>
                <div className="suggested-tags-list">
                  {suggestedTags.map((tag, index) => (
                    <button
                      key={index}
                      className="suggested-tag"
                      style={{ backgroundColor: tag.color || '#3498db' }}
                      onClick={() => handleAddTag(tag.name, tag.color)}
                      disabled={loading}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;