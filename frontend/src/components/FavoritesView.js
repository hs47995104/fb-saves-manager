import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHeart, FiFilter, FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getAllItems } from '../api';
import ItemCard from './ItemCard';
import './Styles.css';

const FavoritesView = ({ onUpdate }) => {
  const navigate = useNavigate();
  
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeen, setFilterSeen] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const response = await getAllItems();
      
      const allFavorites = [];
      response.data.forEach(collection => {
        if (collection.saves && Array.isArray(collection.saves)) {
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
            }
          });
        }
      });
      
      setFavorites(allFavorites);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
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
      <div className="favorites-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FiArrowLeft /> Back to Collections
        </button>
        
        <div className="title-section">
          <FiHeart className="heart-icon" style={{ color: '#e74c3c' }} />
          <h1>Your Favorites</h1>
          <span className="favorite-count">{favorites.length} items</span>
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
                  placeholder="Search in favorites..."
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
              </div>
            </div>
          )}
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <FiHeart size={64} style={{ color: '#ddd' }} />
          <h3>No favorites yet</h3>
          <p>Click the heart icon on any item to add it to your favorites</p>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="empty-state">
          <p>No items match your filters</p>
          <button 
            className="clear-filters-btn"
            onClick={() => {
              setSearchTerm('');
              setFilterSeen('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {filteredFavorites.map((item, index) => (
            <ItemCard
              key={`${item.parentFbid}-${item.saveIndex}`}
              item={item.save}
              parentId={item.parentFbid}
              parentTitle={item.parentTitle}
              saveIndex={item.saveIndex}
              onUpdate={handleItemUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesView;