// frontend/src/components/TagsView.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiHash, 
  FiSearch, 
  FiLoader, 
  FiTag,
  FiRefreshCw,
  FiGrid,
  FiList
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getAllTags, getItemsByTag } from '../api';
import ItemCard from './ItemCard';
import BatchActionBar from './BatchActionBar';
import { getDuplicateInfo } from '../utils/duplicateDetector';
import './Styles.css';

const TagsView = ({ onUpdate }) => {
  const navigate = useNavigate();
  
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagItems, setTagItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTags();
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
      {/* Header Section - Matching Collections/All-Items style */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FiArrowLeft /> Back
          </button>
          <div className="header-title-section">
            <FiTag className="header-icon" />
            <h1>Tags</h1>
            <span className="total-count">{tags.length} tags</span>
          </div>
        </div>
        
        <div className="header-actions">
          {selectedTag && (
            <button
              className="back-to-tags-btn"
              onClick={() => setSelectedTag(null)}
            >
              ← Back to all tags
            </button>
          )}
          <button 
            onClick={handleRefresh} 
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Grid - Only show when viewing all tags */}
      {!selectedTag && tags.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FiTag />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Tags</span>
              <span className="stat-value">{tags.length}</span>
            </div>
          </div>

          <div className="stat-card popular">
            <div className="stat-icon">
              <FiHash />
            </div>
            <div className="stat-content">
              <span className="stat-label">Most Used</span>
              <span className="stat-value">
                {tags.length > 0 ? tags[0].name : 'N/A'}
              </span>
              <span className="stat-percent">
                {tags.length > 0 ? `${tags[0].count} items` : ''}
              </span>
            </div>
          </div>

          <div className="stat-card total-items">
            <div className="stat-icon">
              <FiGrid />
            </div>
            <div className="stat-content">
              <span className="stat-label">Tagged Items</span>
              <span className="stat-value">
                {tags.reduce((sum, tag) => sum + tag.count, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section - Search and View Toggle */}
      {!selectedTag && tags.length > 0 && (
        <div className="filters-section">
          <div className="filters-panel">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </button>
              )}
            </div>

            <div className="filter-group">
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <FiGrid />
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <FiList />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="tags-content">
        {selectedTag ? (
          // Tag Items View
          <div className="tag-items-view">
            <div className="list-header" style={{ marginBottom: '16px' }}>
              <div className="header-title-section">
                <span 
                  className="tag-badge"
                  style={{ backgroundColor: selectedTag.color || '#3498db' }}
                >
                  <FiHash size={14} />
                  {selectedTag.name}
                </span>
                <span className="total-count">{selectedTag.count} items</span>
              </div>
            </div>

            {itemsLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading items...</p>
              </div>
            ) : tagItems.length === 0 ? (
              <div className="empty-state enhanced">
                <div className="empty-icon">🏷️</div>
                <h3>No items with this tag</h3>
                <p>Add this tag to items to see them here</p>
              </div>
            ) : (
              <>
                <BatchActionBar
                  items={tagItems.map(item => ({
                    save: item.save,
                    parentId: item.parentFbid,
                    parentTitle: item.parentTitle,
                    saveIndex: item.saveIndex
                  }))}
                  onComplete={handleItemUpdate}
                />
                <div className="items-grid">
                  {tagItems.map((item, index) => (
                    <ItemCard
                      key={`${item.parentFbid}-${item.saveIndex}-${index}`}
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
              </>
            )}
          </div>
        ) : (
          // All Tags View
          <>
            {filteredTags.length === 0 ? (
              <div className="empty-state enhanced">
                <div className="empty-icon">🏷️</div>
                <h3>No tags found</h3>
                <p>
                  {searchTerm 
                    ? 'Try adjusting your search' 
                    : 'Add tags to your saved items to organize them better'}
                </p>
                {searchTerm && (
                  <button 
                    className="clear-filters-btn"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className={`tags-grid ${viewMode}`}>
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
                      <div className="tag-stats">
                        <span className="tag-count">{tag.count} items</span>
                        {tag.count > 0 && (
                          <span className="tag-preview">
                            Click to view items →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Stats */}
            {filteredTags.length > 0 && (
              <div className="collections-footer">
                <div className="footer-stats">
                  <span>
                    <strong>{filteredTags.length}</strong> tags
                  </span>
                  <span className="separator">•</span>
                  <span>
                    <strong>{filteredTags.reduce((sum, tag) => sum + tag.count, 0)}</strong> tagged items
                  </span>
                  <span className="separator">•</span>
                  <span>
                    <strong>{(filteredTags.reduce((sum, tag) => sum + tag.count, 0) / filteredTags.length).toFixed(1)}</strong> avg items per tag
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TagsView;