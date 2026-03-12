// frontend/src/components/ReelsView.js

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import { toast } from 'react-toastify';
import { 
  FiArrowLeft, 
  FiFilm,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiGrid,
  FiList,
  FiEye,
  FiEyeOff,
  FiHeart,
  FiExternalLink,
  FiClock
} from 'react-icons/fi';
import { getSaves, getAllItems } from '../api';
import { useSelection } from '../contexts/SelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import { filterVideoItems, groupVideosByPlatform, getVideoStats, getVideoPlatform } from '../utils/videoDetector';
import ItemCard from './ItemCard';
import BatchActionBar from './BatchActionBar';
import { getDuplicateInfo } from '../utils/duplicateDetector';
import './Styles.css';
import './ReelsView.css';

const ReelsView = ({ onUpdate }) => {
  const navigate = useNavigate();
  const { clearSelection } = useSelection();
  const { settings } = useSettings();
  
  const [items, setItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [duplicateMap, setDuplicateMap] = useState(new Map());
  const [stats, setStats] = useState({ total: 0, platforms: {} });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeen, setFilterSeen] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [groupByPlatform, setGroupByPlatform] = useState(false);

  const fetchVideoItems = useCallback(async (pageNum, append = false) => {
    try {
      setError(null);
      const response = await getSaves(pageNum, 50);
      
      const newItems = response.data.items || [];
      
      // Load collections for duplicate detection
      const collectionsResponse = await getAllItems();
      setCollections(collectionsResponse.data || []);
      
      // Create duplicate map
      if (collectionsResponse.data?.length > 0) {
        const { detectDuplicates } = await import('../utils/duplicateDetector');
        const { duplicateMap } = detectDuplicates(collectionsResponse.data);
        setDuplicateMap(duplicateMap);
        window.__duplicateMap = duplicateMap;
      }
      
      // Filter video items
      const videos = filterVideoItems(newItems);
      
      setHasMore(pageNum < (response.data.pagination?.pages || 1));
      
      if (append) {
        setItems(prev => [...prev, ...newItems]);
        setVideoItems(prev => [...prev, ...videos]);
      } else {
        setItems(newItems);
        setVideoItems(videos);
        clearSelection();
      }
      
      // Update stats
      const allVideos = append ? [...videoItems, ...videos] : videos;
      setStats(getVideoStats(allVideos));
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clearSelection]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideoItems(nextPage, true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    clearSelection();
    await fetchVideoItems(1, false);
  };

  const handleItemUpdate = async () => {
    setRefreshing(true);
    try {
      setPage(1);
      await fetchVideoItems(1, false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error refreshing after update:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const getFilteredVideos = useCallback(() => {
    let filtered = videoItems;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const save = item.save || item;
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
      filtered = filtered.filter(item => {
        const save = item.save || item;
        return save.seen === seenValue;
      });
    }
    
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(item => {
        const save = item.save || item;
        const platform = getVideoPlatform(save.url);
        return platform?.id === selectedPlatform;
      });
    }
    
    return filtered;
  }, [videoItems, searchTerm, filterSeen, selectedPlatform]);

  useEffect(() => {
    fetchVideoItems(1, false);
  }, []);

  const filteredVideos = getFilteredVideos();
  const groupedVideos = groupByPlatform ? groupVideosByPlatform(filteredVideos) : { all: { platform: { name: 'All Videos', icon: '🎬' }, items: filteredVideos } };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading video content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Videos</h3>
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-btn">
          <FiRefreshCw /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="reels-view">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FiArrowLeft /> Back
          </button>
          <div className="header-title-section">
            <FiFilm className="header-icon" style={{ color: '#e74c3c' }} />
            <h1>Reels & Videos</h1>
            <span className="total-count">{stats.total} videos</span>
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
            <FiFilm />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Videos</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        {Object.entries(stats.platforms).slice(0, 3).map(([platform, count]) => (
          <div key={platform} className="stat-card platform">
            <div className="stat-icon">
              <span>{platform === 'YouTube' ? '🎬' : platform === 'Instagram' ? '📷' : platform === 'TikTok' ? '🎵' : '📺'}</span>
            </div>
            <div className="stat-content">
              <span className="stat-label">{platform}</span>
              <span className="stat-value">{count}</span>
            </div>
          </div>
        ))}
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
                placeholder="Search in videos..."
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
              <label>Platform:</label>
              <select 
                value={selectedPlatform} 
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Platforms ({stats.total})</option>
                {Object.entries(stats.platforms).map(([platform, count]) => (
                  <option key={platform} value={platform.toLowerCase()}>
                    {platform} ({count})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={filterSeen} 
                onChange={(e) => setFilterSeen(e.target.value)}
                className="filter-select"
              >
                <option value="all">All videos</option>
                <option value="seen">Seen</option>
                <option value="unseen">Unseen</option>
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

            <div className="filter-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={groupByPlatform}
                  onChange={(e) => setGroupByPlatform(e.target.checked)}
                />
                Group by platform
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Batch Actions */}
      <BatchActionBar
        items={filteredVideos.map(item => ({
          save: item.save || item,
          parentId: item.parentFbid || item.parentId,
          parentTitle: item.parentTitle,
          saveIndex: item.saveIndex
        }))}
        onComplete={handleItemUpdate}
      />

      {/* Main Content */}
      {videoItems.length === 0 ? (
        <div className="empty-state enhanced">
          <div className="empty-icon">🎬</div>
          <h3>No videos found</h3>
          <p>Upload your Facebook data to see video content</p>
          <button 
            className="primary-btn"
            onClick={() => navigate('/upload')}
          >
            Upload Data
          </button>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="empty-state enhanced">
          <div className="empty-icon">🔍</div>
          <h3>No videos match your filters</h3>
          <p>Try adjusting your search or filter criteria</p>
          <button 
            className="clear-filters-btn"
            onClick={() => {
              setSearchTerm('');
              setFilterSeen('all');
              setSelectedPlatform('all');
            }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={filteredVideos.length}
          next={loadMore}
          hasMore={hasMore}
          loader={
            <div className="loader">
              <div className="spinner"></div>
              <span>Loading more videos...</span>
            </div>
          }
          endMessage={
            <div className="end-message">
              <p>✨ You've seen all your videos!</p>
            </div>
          }
        >
          {Object.entries(groupedVideos).map(([platformId, group]) => (
            <div key={platformId} className="platform-group">
              {groupByPlatform && (
                <div className="platform-header">
                  <span className="platform-icon">{group.platform.icon}</span>
                  <h3>{group.platform.name}</h3>
                  <span className="platform-count">{group.items.length} videos</span>
                </div>
              )}
              
              <div className={`items-grid ${viewMode}`}>
                {group.items.map((item, index) => (
                  <ItemCard
                    key={`${item.parentFbid}-${item.saveIndex}-${index}`}
                    item={item.save || item}
                    parentId={item.parentFbid || item.parentId}
                    parentTitle={item.parentTitle}
                    saveIndex={item.saveIndex}
                    onUpdate={handleItemUpdate}
                    duplicateInfo={getDuplicateInfo(
                      item.parentFbid || item.parentId,
                      item.saveIndex,
                      duplicateMap
                    )}
                    duplicateMap={duplicateMap}
                  />
                ))}
              </div>
            </div>
          ))}
        </InfiniteScroll>
      )}

      {/* Footer Stats */}
      {filteredVideos.length > 0 && (
        <div className="collections-footer">
          <div className="footer-stats">
            <span>
              <strong>{filteredVideos.length}</strong> videos shown
            </span>
            <span className="separator">•</span>
            <span>
              <strong>{stats.total}</strong> total videos
            </span>
            <span className="separator">•</span>
            <span>
              <strong>{Object.keys(stats.platforms).length}</strong> platforms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsView;