// frontend/src/components/AllItemsView.js - Updated duplicate detection

import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { toast } from 'react-toastify';
import { 
  getSaves, 
  getStats, 
  getAllItems
} from '../api';
import { useSelection } from '../contexts/SelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import { detectDuplicates, filterItemsByDuplicateSettings, getDuplicateStats } from '../utils/duplicateDetector';
import ItemCard from './ItemCard';
import BatchActionBar from './BatchActionBar';
import { getDuplicateInfo } from '../utils/duplicateDetector';
import { 
  FiLoader, 
  FiBarChart2, 
  FiRefreshCw, 
  FiSearch,
  FiFilter,
  FiHeart,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import './Styles.css';

const AllItemsView = ({ onUpdate }) => {
  const { clearSelection } = useSelection();
  const { settings } = useSettings();
  
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [duplicateMap, setDuplicateMap] = useState(new Map());
  const [duplicateStats, setDuplicateStats] = useState({ totalDuplicates: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeen, setFilterSeen] = useState('unseen');
  const [showFilters, setShowFilters] = useState(false);

  const detectAndSetDuplicates = useCallback((collectionsData) => {
    if (collectionsData.length > 0) {
      const { duplicateMap } = detectDuplicates(collectionsData);
      setDuplicateMap(duplicateMap);
      
      const stats = getDuplicateStats(collectionsData, duplicateMap);
      setDuplicateStats(stats);
      
      window.__duplicateMap = duplicateMap;
    }
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await getAllItems();
      setCollections(response.data || []);
      detectAndSetDuplicates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  };

  const fetchSaves = useCallback(async (pageNum, append = false) => {
    try {
      setError(null);
      const response = await getSaves(pageNum, 50);
      
      const newItems = response.data.items || [];
      
      if (collections.length === 0) {
        const collectionsResponse = await getAllItems();
        setCollections(collectionsResponse.data || []);
        detectAndSetDuplicates(collectionsResponse.data || []);
      }
      
      setHasMore(pageNum < (response.data.pagination?.pages || 1));
      
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
        clearSelection();
      }
      
      await fetchStats();
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clearSelection, collections.length, detectAndSetDuplicates]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSaves(nextPage, true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    clearSelection();
    await fetchSaves(1, false);
    await fetchCollections();
  };

  const handleItemUpdate = async () => {
    setRefreshing(true);
    try {
      await fetchStats();
      const collectionsResponse = await getAllItems();
      setCollections(collectionsResponse.data || []);
      detectAndSetDuplicates(collectionsResponse.data || []);
      setPage(1);
      await fetchSaves(1, false);
    } catch (error) {
      console.error('Error refreshing after update:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const getFilteredItems = useCallback(() => {
    let filtered = items;
    
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
    
    filtered = filterItemsByDuplicateSettings(filtered, duplicateMap, settings.showDuplicates);
    
    return filtered;
  }, [items, searchTerm, filterSeen, duplicateMap, settings.showDuplicates]);

  useEffect(() => {
    if (collections.length > 0) {
      detectAndSetDuplicates(collections);
    }
  }, [collections, detectAndSetDuplicates]);

  useEffect(() => {
    fetchSaves(1, false);
    fetchCollections();
  }, []);

  const filteredItems = getFilteredItems();
  
  // Calculate percentages
  const seenPercentage = stats ? Math.round((stats.seenSaves / (stats.totalSaves || 1)) * 100) : 0;
  const favoritePercentage = stats ? Math.round(((stats.favoriteSaves || 0) / (stats.totalSaves || 1)) * 100) : 0;
  const duplicatePercentage = stats ? Math.round((duplicateStats.totalDuplicates / (stats.totalSaves || 1)) * 100) : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading all items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Items</h3>
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-btn">
          <FiRefreshCw /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="all-items-container">
      <div className="list-header">
        <div className="header-title-section">
          <h1>All Saved Items</h1>
          <span className="total-count">{stats?.totalSaves || 0} items</span>
        </div>
        
        <button 
          onClick={handleRefresh} 
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <FiBarChart2 />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Items</span>
            <span className="stat-value">{stats?.totalSaves || 0}</span>
          </div>
        </div>

        <div className="stat-card seen">
          <div className="stat-icon">
            <FiEye />
          </div>
          <div className="stat-content">
            <span className="stat-label">Seen</span>
            <span className="stat-value">{stats?.seenSaves || 0}</span>
            <span className="stat-percent">{seenPercentage}%</span>
          </div>
        </div>

        <div className="stat-card favorites">
          <div className="stat-icon">
            <FiHeart />
          </div>
          <div className="stat-content">
            <span className="stat-label">Favorites</span>
            <span className="stat-value">{stats?.favoriteSaves || 0}</span>
            <span className="stat-percent">{favoritePercentage}%</span>
          </div>
        </div>

        {settings.showDuplicates && duplicateStats.totalDuplicates > 0 && (
          <div className="stat-card duplicates">
            <div className="stat-icon">
              <FiCopy />
            </div>
            <div className="stat-content">
              <span className="stat-label">Duplicates</span>
              <span className="stat-value">{duplicateStats.totalDuplicates}</span>
              <span className="stat-percent">{duplicatePercentage}%</span>
            </div>
          </div>
        )}
      </div>

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
                placeholder="Search by title, name, or URL..."
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
                <option value="all">All items</option>
                <option value="seen">Seen only</option>
                <option value="unseen">Unseen only</option>
              </select>
            </div>

            <div className="filter-info">
              <FiEyeOff className="info-icon" />
              <span>Showing <strong>{filterSeen === 'unseen' ? 'unseen' : filterSeen === 'seen' ? 'seen' : 'all'}</strong> items</span>
            </div>
          </div>
        )}
      </div>

      <BatchActionBar
        items={filteredItems.map(item => ({
          save: item.save || item,
          parentId: item.parentFbid || item.parentId,
          parentTitle: item.parentTitle,
          saveIndex: item.saveIndex
        }))}
        onComplete={handleRefresh}
      />

      {filteredItems.length === 0 ? (
        <div className="empty-state enhanced">
          <div className="empty-icon">📦</div>
          <h3>No items found</h3>
          <p>
            {searchTerm || filterSeen !== 'all' 
              ? 'Try adjusting your filters'
              : 'Upload your Facebook data to get started'}
          </p>
          {(searchTerm || filterSeen !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setFilterSeen('unseen');
              }}
            >
              Clear All Filters
            </button>
          )}
          {!settings.showDuplicates && duplicateStats.totalDuplicates > 0 && (
            <p className="duplicate-note">
              <FiCopy /> {duplicateStats.totalDuplicates} duplicate item{duplicateStats.totalDuplicates !== 1 ? 's' : ''} are hidden based on URL. 
              Enable "Show Duplicates" in settings to view them.
            </p>
          )}
        </div>
      ) : (
        <InfiniteScroll
          dataLength={filteredItems.length}
          next={loadMore}
          hasMore={hasMore}
          loader={
            <div className="loader">
              <div className="spinner"></div>
              <span>Loading more...</span>
            </div>
          }
          endMessage={
            <div className="end-message">
              <p>✨ You've seen all your saved items!</p>
            </div>
          }
        >
          <div className="items-grid">
            {filteredItems.map((item, index) => (
              <ItemCard
                key={`${item.parentFbid || item.save?.url || index}-${index}`}
                item={item.save || item}
                parentId={item.parentFbid || item.parentId}
                parentTitle={item.parentTitle}
                saveIndex={item.saveIndex !== undefined ? item.saveIndex : index}
                onUpdate={handleItemUpdate}
                duplicateInfo={getDuplicateInfo(
                  item.parentFbid || item.parentId, 
                  item.saveIndex !== undefined ? item.saveIndex : index, 
                  duplicateMap
                )}
                duplicateMap={duplicateMap}
              />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default AllItemsView;