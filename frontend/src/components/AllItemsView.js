import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { toast } from 'react-toastify';
import { 
  getSaves, 
  getStats, 
  getAllItems,
  deleteAllSeen 
} from '../api';
import { useSelection } from '../contexts/SelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import { detectDuplicates, filterItemsByDuplicateSettings } from '../utils/duplicateDetector';
import ItemCard from './ItemCard';
import DeleteModal from './DeleteModal';
import BatchActionBar from './BatchActionBar';
import { 
  FiLoader, 
  FiBarChart2, 
  FiRefreshCw, 
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiFilter,
  FiHeart,
  FiCopy
} from 'react-icons/fi';
import './Styles.css';

const AllItemsView = ({ onUpdate }) => {
  const { clearSelection } = useSelection();
  const { settings } = useSettings();
  
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [duplicateMap, setDuplicateMap] = useState(new Map());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [showDeleteAllSeenModal, setShowDeleteAllSeenModal] = useState(false);
  const [deletingAllSeen, setDeletingAllSeen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeen, setFilterSeen] = useState('unseen');
  const [showFilters, setShowFilters] = useState(false);

  const detectAndSetDuplicates = useCallback((collectionsData) => {
    if (settings.autoDetectDuplicates && collectionsData.length > 0) {
      const { duplicateMap } = detectDuplicates(collectionsData, settings);
      setDuplicateMap(duplicateMap);
      window.__duplicateMap = duplicateMap;
    }
  }, [settings]);

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

  const handleDeleteAllSeen = async () => {
    setDeletingAllSeen(true);
    try {
      const response = await deleteAllSeen();
      
      if (response.data.success) {
        toast.success(`Deleted ${response.data.totalDeleted} seen items`);
        setShowDeleteAllSeenModal(false);
        clearSelection();
        await handleRefresh();
      } else {
        toast.error(response.data.error || 'Failed to delete seen items');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete seen items');
    } finally {
      setDeletingAllSeen(false);
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
    
    filtered = filterItemsByDuplicateSettings(filtered, duplicateMap, settings);
    
    return filtered;
  }, [items, searchTerm, filterSeen, duplicateMap, settings]);

  useEffect(() => {
    if (collections.length > 0) {
      detectAndSetDuplicates(collections);
    }
  }, [collections, settings.prioritizeBySize, settings.duplicateMatchFields, detectAndSetDuplicates]);

  useEffect(() => {
    fetchSaves(1, false);
    fetchCollections();
  }, []);

  const filteredItems = getFilteredItems();
  const duplicateCount = Array.from(duplicateMap.values()).filter(d => d.isDuplicate).length;

  if (loading) {
    return (
      <div className="loading-container">
        <FiLoader className="spinner" />
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
        <h1>All Saved Items</h1>
        
        {stats && (
          <div className="stats-bar">
            <div className="stat">
              <FiBarChart2 />
              <span>Total: {stats.totalSaves}</span>
            </div>
            <div className="stat">
              <FiEye />
              <span>Seen: {stats.seenSaves}</span>
              <span className="stat-percent">
                ({Math.round((stats.seenSaves / (stats.totalSaves || 1)) * 100)}%)
              </span>
            </div>
            <div className="stat" style={{ color: '#e74c3c' }}>
              <FiHeart />
              <span>Favorites: {stats.favoriteSaves || 0}</span>
              <span className="stat-percent">
                ({Math.round(((stats.favoriteSaves || 0) / (stats.totalSaves || 1)) * 100)}%)
              </span>
            </div>
            
            {/* Note about default unseen filter */}
            <div className="stat" style={{ color: '#1877f2', background: '#e7f3ff', padding: '4px 12px', borderRadius: '20px' }}>
              <FiEyeOff />
              <span>Showing unseen by default</span>
            </div>
            
            {/* Duplicate stats - only show if duplicates are enabled in settings */}
            {settings.showDuplicates && duplicateCount > 0 && (
              <div className="stat duplicate-stat">
                <FiCopy />
                <span>Duplicates: {duplicateCount}</span>
                <span className="stat-percent">
                  ({Math.round((duplicateCount / (stats.totalSaves || 1)) * 100)}%)
                </span>
              </div>
            )}
            
            {/* Delete Seen button - only show if there are seen items */}
            {stats.seenSaves > 0 && (
              <button
                className="delete-seen-btn"
                onClick={() => setShowDeleteAllSeenModal(true)}
                disabled={deletingAllSeen}
              >
                <FiTrash2 /> Delete Seen
              </button>
            )}
          </div>
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

      <div className="filters-bar">
        <button 
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter />
          Filters
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
            </div>            
            <div className="seen-filter">
              <label>Status:</label>
              <select 
                value={filterSeen} 
                onChange={(e) => setFilterSeen(e.target.value)}
              >
                <option value="all">All</option>
                <option value="seen">Seen</option>
                <option value="unseen">Unseen</option>
              </select>
              <span style={{ fontSize: '12px', color: '#65676b', marginLeft: '8px' }}>
                (unseen by default)
              </span>
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
        <div className="empty-state">
          {searchTerm || filterSeen !== 'all' ? (
            <div>
              <p>No items match your filters</p>
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSearchTerm('');
                  setFilterSeen('unseen');
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <p>No saved items found. Upload your Facebook data to get started.</p>
              {settings.showDuplicates && duplicateCount > 0 && (
                <p className="duplicate-note">
                  <FiCopy /> {duplicateCount} duplicate items are hidden. 
                  Enable "Show Duplicates" in settings to view them.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <InfiniteScroll
          dataLength={filteredItems.length}
          next={loadMore}
          hasMore={hasMore}
          loader={
            <div className="loader">
              <FiLoader className="spinner" />
              <span>Loading more...</span>
            </div>
          }
          endMessage={
            <div className="end-message">
              <p>You've seen all your saved items! 🎉</p>
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
              />
            ))}
          </div>
        </InfiniteScroll>
      )}

      <DeleteModal
        isOpen={showDeleteAllSeenModal}
        onClose={() => setShowDeleteAllSeenModal(false)}
        onConfirm={handleDeleteAllSeen}
        title="Delete All Seen Items"
        message="Are you sure you want to delete all items you've marked as seen?"
        itemCount={stats?.seenSaves || 0}
      />
    </div>
  );
};

export default AllItemsView;