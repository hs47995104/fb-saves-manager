import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHash, FiSearch, FiLoader, FiTag } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getAllTags, getItemsByTag } from '../api';
import ItemCard from './ItemCard';
import { getDuplicateInfo } from '../utils/duplicateDetector';
import './Styles.css';

const TagsView = ({ onUpdate }) => {
  const navigate = useNavigate();
  
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagItems, setTagItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    if (selectedTag) {
      loadItemsByTag(selectedTag.name);
    }
  }, [selectedTag]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await getAllTags();
      setTags(response.data.tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const loadItemsByTag = async (tagName) => {
    setItemsLoading(true);
    try {
      const response = await getItemsByTag(tagName);
      setTagItems(response.data.items || []);
    } catch (error) {
      console.error('Failed to load items by tag:', error);
      toast.error('Failed to load items');
    } finally {
      setItemsLoading(false);
    }
  };

  const handleItemUpdate = async () => {
    if (selectedTag) {
      await loadItemsByTag(selectedTag.name);
    }
    if (onUpdate) onUpdate();
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading tags...</p>
      </div>
    );
  }

  return (
    <div className="tags-view">
      <div className="tags-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FiArrowLeft /> Back to Collections
        </button>
        
        <div className="title-section">
          <FiTag className="tags-icon" />
          <h1>Tags</h1>
          <span className="tag-count">{tags.length} tags</span>
        </div>

        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="tags-content">
        {selectedTag ? (
          <div className="tag-items-view">
            <button
              className="back-to-tags"
              onClick={() => setSelectedTag(null)}
            >
              ← Back to all tags
            </button>
            
            <h2>
              <span 
                className="tag-badge"
                style={{ backgroundColor: selectedTag.color || '#3498db' }}
              >
                {selectedTag.name}
              </span>
              <span className="item-count">{selectedTag.count} items</span>
            </h2>

            {itemsLoading ? (
              <div className="items-loading">
                <div className="spinner"></div>
                <span>Loading items...</span>
              </div>
            ) : tagItems.length === 0 ? (
              <div className="empty-state">
                <p>No items with this tag</p>
              </div>
            ) : (
              <div className="items-grid">
                {tagItems.map((item, index) => (
                  <ItemCard
                    key={`${item.parentFbid}-${item.saveIndex}`}
                    item={item.save}
                    parentId={item.parentFbid}
                    parentTitle={item.parentTitle}
                    saveIndex={item.saveIndex}
                    onUpdate={handleItemUpdate}
                    duplicateInfo={window.__duplicateMap ? getDuplicateInfo(
                      item.parentFbid,
                      item.saveIndex,
                      window.__duplicateMap
                    ) : null}
                    duplicateMap={window.__duplicateMap}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {tags.length === 0 ? (
              <div className="empty-state">
                <FiHash size={48} />
                <h3>No tags yet</h3>
                <p>Add tags to your saved items to organize them better</p>
              </div>
            ) : (
              <div className="tags-grid">
                {filteredTags.map((tag, index) => (
                  <div
                    key={index}
                    className="tag-card"
                    onClick={() => setSelectedTag(tag)}
                    style={{ borderLeftColor: tag.color || '#3498db' }}
                  >
                    <div className="tag-info">
                      <span 
                        className="tag-name"
                        style={{ backgroundColor: tag.color || '#3498db' }}
                      >
                        <FiHash size={12} />
                        {tag.name}
                      </span>
                      <span className="tag-count">{tag.count} items</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TagsView;