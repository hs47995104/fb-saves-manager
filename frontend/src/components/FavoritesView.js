// frontend/src/components/FavoritesView.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiHeart, 
  FiFilter, 
  FiSearch, 
  FiChevronDown, 
  FiChevronUp,
  FiRefreshCw,
  FiGrid,
  FiList,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getAllItems } from '../api';
import ItemCard from './ItemCard';
import BatchActionBar from './BatchActionBar';
import { getDuplicateInfo } from '../utils/duplicateDetector';
import './Styles.css';

const FavoritesView = ({ onUpdate }) => {
  const navigate = useNavigate();
  
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeen, setFilterSeen] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [stats, setStats] = useState({
    total: 0,
    seen: 0,
    unseen: 0,
    collections: 0
  });

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const response = await getAllItems();
      
      const allFavorites = [];
      const collectionSet = new Set();
      
      response.data.forEach(collection => {
        if (collection.saves && Array.isArray(collection.saves)) {
          let collectionHasFavorite = false;
          
          collection.saves.forEach((save, index) => {
            if (save.favorite) {
              allFavorites.push({
                save: save,
                parentFbid: collection.fbid,
                parentId: collection.fbid,
                parentTitle: collection.title,
                parentTimestamp: collection.timestamp,
                saveIndex: index
              });
              collectionHasFavorite = true;
            }
          });
          
          if (collectionHasFavorite) {
            collectionSet.add(collection.fbid);
          }
        }
      });
      
      setFavorites(allFavorites);
      
      // Calculate stats
      const seen = allFavorites.filter(item => item.save.seen).length;
      setStats({
        total: allFavorites.length,
        seen: seen,
        unseen: allFavorites.length - seen,
        collections: collectionSet.size
      });
    } catch (error) {
      console.error('Failed to load favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
  };

  const handleItemUpdate = async () => {
    await loadFavorites();
    if (onUpdate) onUpdate();
  };

  const getFilteredFavorites = () => {
    let filtered = favorites;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const save = item.save;
        return (
          (save.title && save.title.toLowerCase().includes(term)) ||
          (save.name && save.name.toLowerCase().includes(term)) ||
          (save.url && save.url.toLowerCase().includes(term)) ||
          (item.parentTitle && item.parentTitle.toLowerCase().includes(term))
        );
      });
    }
    
    if (filterSeen !== 'all') {
      const seenValue = filterSeen === 'seen';
      filtered = filtered.filter(item => item.save.seen === seenValue);
    }
    
    return filtered;
  };

  const filteredFavorites = getFilteredFavorites();
  const seenPercentage = stats.total ? Math.round((stats.seen / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading favorites...</p>
      </div>
    );
  }

  return (
    <div className="favorites-view">
      {/* Header Section - Matching Collections/All-Items style */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FiArrowLeft /> Back
          </button>
          <div className="header-title-section">
            <FiHeart className="header-icon" style={{ color: '#e74c3c' }} />
            <h1>Your Favorites</h1>
            <span className="total-count">{stats.total} items</span>
          </div>
        </div>
        
        <div className="header-actions">
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

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <FiHeart style={{ color: '#e74c3c' }} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Favorites</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="stat-card seen">
          <div className="stat-icon">
            <FiEye />
          </div>
          <div className="stat-content">
            <span className="stat-label">Seen</span>
            <span className="stat-value">{stats.seen}</span>
            <span className="stat-percent">{seenPercentage}%</span>
          </div>
        </div>

        <div className="stat-card unseen">
          <div className="stat-icon">
            <FiEyeOff />
          </div>
          <div className="stat-content">
            <span className="stat-label">Unseen</span>
            <span className="stat-value">{stats.unseen}</span>
            <span className="stat-percent">{100 - seenPercentage}%</span>
          </div>
        </div>

        <div className="stat-card collections">
          <div className="stat-icon">
            <FiGrid />
          </div>
          <div className="stat-content">
            <span className="stat-label">Collections</span>
            <span className="stat-value">{stats.collections}</span>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <button 
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter />
          <span>Filters</span>
          {showFilters ? <FiChevronUp /> : <FiChevronDown />}
        </button>

        {showFilters && (
          <div className="filters-panel">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search in favorites..."
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
              <label>Status:</label>
              <select 
                value={filterSeen} 
                onChange={(e) => setFilterSeen(e.target.value)}
                className="filter-select"
              >
                <option value="all">All items ({stats.total})</option>
                <option value="seen">Seen ({stats.seen})</option>
                <option value="unseen">Unseen ({stats.unseen})</option>
              </select>
            </div>

            <div className="filter-group">
              <label>View:</label>
              <div className="view-mode-buttons">
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
      </div>

      {/* Main Content */}
      {favorites.length === 0 ? (
        <div className="empty-state enhanced">
          <div className="empty-icon">❤️</div>
          <h3>No favorites yet</h3>
          <p>Click the heart icon on any item to add it to your favorites</p>
          <button 
            className="primary-btn"
            onClick={() => navigate('/collections')}
          >
            Browse Collections
          </button>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="empty-state enhanced">
          <div className="empty-icon">🔍</div>
          <h3>No items match your filters</h3>
          <p>Try adjusting your search or filter criteria</p>
          <button 
            className="clear-filters-btn"
            onClick={() => {
              setSearchTerm('');
              setFilterSeen('all');
            }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <BatchActionBar
            items={filteredFavorites.map(item => ({
              save: item.save,
              parentId: item.parentFbid,
              parentTitle: item.parentTitle,
              saveIndex: item.saveIndex
            }))}
            onComplete={handleItemUpdate}
          />
          
          <div className={`items-grid ${viewMode}`}>
            {filteredFavorites.map((item, index) => (
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

          {/* Footer Stats */}
          <div className="collections-footer">
            <div className="footer-stats">
              <span>
                <strong>{filteredFavorites.length}</strong> items shown
              </span>
              <span className="separator">•</span>
              <span>
                <strong>{stats.total}</strong> total favorites
              </span>
              <span className="separator">•</span>
              <span>
                <strong>{stats.collections}</strong> collections
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FavoritesView;