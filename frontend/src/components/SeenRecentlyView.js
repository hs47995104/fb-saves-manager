// frontend/src/components/SeenRecentlyView.js - Redesigned version

import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FiClock, 
  FiEye, 
  FiSearch, 
  FiFilter, 
  FiChevronDown, 
  FiChevronUp,
  FiLoader,
  FiRefreshCw,
  FiCalendar,
  FiArrowLeft,
  FiBarChart2,
  FiTrash2,
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi';
import { getRecentlySeen, deleteAllSeen } from '../api';
import { useSelection } from '../contexts/SelectionContext';
import ItemCard from './ItemCard';
import BatchActionBar from './BatchActionBar';
import DeleteModal from './DeleteModal';
import './Styles.css';

const SeenRecentlyView = ({ onUpdate }) => {
  const navigate = useNavigate();
  const { clearSelection } = useSelection();
  
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0, month: 0 });
  const [showDeleteAllSeenModal, setShowDeleteAllSeenModal] = useState(false);
  const [deletingAllSeen, setDeletingAllSeen] = useState(false);

  const fetchSeenItems = useCallback(async (pageNum, append = false) => {
    try {
      setError(null);
      const response = await getRecentlySeen(pageNum, 50);
      
      const newItems = response.data.items || [];
      
      setHasMore(pageNum < (response.data.pagination?.pages || 1));
      
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
        clearSelection();
      }

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const allItems = append ? [...items, ...newItems] : newItems;
      
      setStats({
        total: allItems.length,
        today: allItems.filter(item => new Date(item.lastSeenAt) >= today).length,
        week: allItems.filter(item => new Date(item.lastSeenAt) >= weekAgo).length,
        month: allItems.filter(item => new Date(item.lastSeenAt) >= monthAgo).length
      });
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clearSelection, items]);

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

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSeenItems(nextPage, true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    clearSelection();
    await fetchSeenItems(1, false);
    if (onUpdate) onUpdate();
  };

  const filterByDateRange = (itemsToFilter) => {
    if (dateRange === 'all') return itemsToFilter;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    return itemsToFilter.filter(item => {
      const lastSeen = new Date(item.lastSeenAt);
      switch(dateRange) {
        case 'today':
          return lastSeen >= today;
        case 'week':
          return lastSeen >= weekAgo;
        case 'month':
          return lastSeen >= monthAgo;
        default:
          return true;
      }
    });
  };

  const filterBySearch = (itemsToFilter) => {
    if (!searchTerm) return itemsToFilter;
    
    const term = searchTerm.toLowerCase();
    return itemsToFilter.filter(item => {
      const save = item.save || item;
      return (
        (save.title && save.title.toLowerCase().includes(term)) ||
        (save.name && save.name.toLowerCase().includes(term)) ||
        (save.url && save.url.toLowerCase().includes(term)) ||
        (item.parentTitle && item.parentTitle.toLowerCase().includes(term))
      );
    });
  };

  const groupItemsByDate = (itemsToGroup) => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    itemsToGroup.forEach(item => {
      if (!item.lastSeenAt) return;
      
      const date = new Date(item.lastSeenAt);
      date.setHours(0, 0, 0, 0);
      
      let groupKey;
      if (date.getTime() === today.getTime()) {
        groupKey = 'today';
      } else if (date.getTime() === yesterday.getTime()) {
        groupKey = 'yesterday';
      } else {
        groupKey = date.toISOString().split('T')[0];
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          label: groupKey === 'today' ? 'Today' : 
                 groupKey === 'yesterday' ? 'Yesterday' : 
                 new Date(groupKey).toLocaleDateString('en-US', { 
                   weekday: 'long', 
                   year: 'numeric', 
                   month: 'long', 
                   day: 'numeric' 
                 }),
          items: []
        };
      }
      groups[groupKey].items.push(item);
    });
    
    // Sort groups by date (most recent first)
    const sortedGroups = {};
    const groupKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'today') return -1;
      if (b === 'today') return 1;
      if (a === 'yesterday') return -1;
      if (b === 'yesterday') return 1;
      return new Date(b) - new Date(a);
    });
    
    groupKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  };

  const getFilteredItems = () => {
    let filtered = items;
    filtered = filterByDateRange(filtered);
    filtered = filterBySearch(filtered);
    return filtered;
  };

  useEffect(() => {
    fetchSeenItems(1, false);
  }, []);

  const filteredItems = getFilteredItems();
  const groupedItems = groupItemsByDate(filteredItems);

  if (loading) {
    return (
      <div className="loading-container">
        <FiLoader className="spinner" />
        <p>Loading seen items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Seen Items</h3>
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-btn">
          <FiRefreshCw /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="seen-recently-view">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FiArrowLeft /> Back
          </button>
          <div className="header-title-section">
            <FiEye className="header-icon" />
            <h1>Seen Recently</h1>
            <span className="total-count">{stats.total} items</span>
          </div>
        </div>
        
        <div className="header-actions">
          {stats.total > 0 && (
            <button
              className="delete-seen-btn"
              onClick={() => setShowDeleteAllSeenModal(true)}
              disabled={deletingAllSeen}
            >
              <FiTrash2 /> Delete All
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

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <FiActivity />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Seen</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="stat-card today">
          <div className="stat-icon">
            <FiClock />
          </div>
          <div className="stat-content">
            <span className="stat-label">Today</span>
            <span className="stat-value">{stats.today}</span>
          </div>
        </div>

        <div className="stat-card week">
          <div className="stat-icon">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <span className="stat-label">This Week</span>
            <span className="stat-value">{stats.week}</span>
          </div>
        </div>

        <div className="stat-card month">
          <div className="stat-icon">
            <FiCalendar />
          </div>
          <div className="stat-content">
            <span className="stat-label">This Month</span>
            <span className="stat-value">{stats.month}</span>
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
                placeholder="Search in seen items..."
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
              <label>Time range:</label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="filter-select"
              >
                <option value="all">All time ({stats.total})</option>
                <option value="month">Last 30 days ({stats.month})</option>
                <option value="week">Last 7 days ({stats.week})</option>
                <option value="today">Today ({stats.today})</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Batch Actions */}
      <BatchActionBar
        items={filteredItems.map(item => ({
          save: item.save || item,
          parentId: item.parentFbid || item.parentId,
          parentTitle: item.parentTitle,
          saveIndex: item.saveIndex
        }))}
        onComplete={handleRefresh}
      />

      {/* Items by Date Groups */}
      {filteredItems.length === 0 ? (
        <div className="empty-state enhanced">
          <div className="empty-icon">👁️</div>
          <h3>No seen items found</h3>
          <p>
            {searchTerm || dateRange !== 'all' 
              ? 'Try adjusting your filters'
              : 'Mark items as seen to track your viewing history'}
          </p>
          {(searchTerm || dateRange !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setDateRange('all');
              }}
            >
              Clear All Filters
            </button>
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
              <p>✨ You've reached the end of your seen history</p>
            </div>
          }
        >
          {Object.entries(groupedItems).map(([key, group]) => (
            <div key={key} className="date-group">
              <div className="date-header modern">
                <div className="date-badge">
                  <FiCalendar className="date-icon" />
                  <h3>{group.label}</h3>
                </div>
                <span className="date-count">
                  {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="items-grid">
                {group.items.map((item, index) => (
                  <ItemCard
                    key={`${item.parentFbid}-${item.saveIndex}-${index}`}
                    item={item.save}
                    parentId={item.parentFbid || item.parentId}
                    parentTitle={item.parentTitle}
                    saveIndex={item.saveIndex}
                    onUpdate={handleRefresh}
                  />
                ))}
              </div>
            </div>
          ))}
        </InfiniteScroll>
      )}

      <DeleteModal
        isOpen={showDeleteAllSeenModal}
        onClose={() => setShowDeleteAllSeenModal(false)}
        onConfirm={handleDeleteAllSeen}
        title="Delete All Seen Items"
        message={`Are you sure you want to delete all ${stats.total} seen items? This action cannot be undone.`}
        itemCount={stats.total}
      />
    </div>
  );
};

export default SeenRecentlyView;