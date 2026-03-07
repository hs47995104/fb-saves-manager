// frontend/src/components/SeenRecentlyView.js - Complete version

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
  FiBarChart2
} from 'react-icons/fi';
import { getRecentlySeen } from '../api';
import { useSelection } from '../contexts/SelectionContext';
import ItemCard from './ItemCard';
import BatchActionBar from './BatchActionBar';
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
  const [dateRange, setDateRange] = useState('all'); // today, week, month, all
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0, month: 0 });

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
  };

  const handleItemUpdate = async () => {
    setRefreshing(true);
    try {
      setPage(1);
      await fetchSeenItems(1, false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error refreshing after update:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const formatLastSeen = (lastSeenAt) => {
    if (!lastSeenAt) return 'Unknown';
    
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Group items by date for display
  const groupItemsByDate = (itemsToGroup) => {
    const groups = {};
    
    itemsToGroup.forEach(item => {
      if (!item.lastSeenAt) return;
      
      const date = new Date(item.lastSeenAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey;
      
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    return groups;
  };

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
      <div className="list-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FiArrowLeft /> Back
          </button>
          <h1>
            <FiEye style={{ marginRight: '12px', color: '#1877f2' }} />
            Seen Recently
          </h1>
        </div>
        
        <div className="stats-bar">
          <div className="stat" title="Total seen items">
            <FiBarChart2 />
            <span>Total: {stats.total}</span>
          </div>
          <div className="stat" title="Seen today">
            <FiClock />
            <span>Today: {stats.today}</span>
          </div>
          <div className="stat" title="Seen this week">
            <FiCalendar />
            <span>This week: {stats.week}</span>
          </div>
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
                placeholder="Search in seen items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="date-filter">
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
          <FiEye size={48} style={{ color: '#ddd' }} />
          <h3>No seen items found</h3>
          <p>
            {searchTerm || dateRange !== 'all' 
              ? 'No items match your filters' 
              : 'Mark items as seen to see them here'}
          </p>
          {(searchTerm || dateRange !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setDateRange('all');
              }}
            >
              Clear Filters
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
              <p>You've reached the end of your seen history 🎉</p>
            </div>
          }
          scrollableTarget="scrollable-content"
        >
          <div id="scrollable-content">
            {Object.entries(groupedItems).map(([date, dateItems]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <FiCalendar className="date-icon" />
                  <h3>{date}</h3>
                  <span className="date-count">
                    {dateItems.length} item{dateItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="items-grid">
                  {dateItems.map((item, index) => (
                    <ItemCard
                      key={`${item.parentFbid}-${item.saveIndex}-${index}`}
                      item={item.save}
                      parentId={item.parentFbid || item.parentId}
                      parentTitle={item.parentTitle}
                      saveIndex={item.saveIndex}
                      onUpdate={handleItemUpdate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default SeenRecentlyView;