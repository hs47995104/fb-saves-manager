// frontend/src/components/CollectionsList.js - Redesigned version

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getAllItems, 
  deleteCollection,
  getStats 
} from '../api';
import { useSelection } from '../contexts/SelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import { detectDuplicates } from '../utils/duplicateDetector';
import CollectionCard from './CollectionCard';
import BatchCollectionActions from './BatchCollectionActions';
import { 
  FiLoader, 
  FiBarChart2, 
  FiRefreshCw, 
  FiFolder,
  FiEye,
  FiHeart,
  FiCopy,
  FiGrid,
  FiChevronRight
} from 'react-icons/fi';
import './Styles.css';

const CollectionsList = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const { clearSelection } = useSelection();
  const { settings } = useSettings();
  
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [duplicateMap, setDuplicateMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
      setError(null);
      setLoading(true);
      const response = await getAllItems();
      setCollections(response.data || []);
      
      detectAndSetDuplicates(response.data || []);
      
      await fetchStats();
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    clearSelection();
    await fetchCollections();
  };

  const handleCollectionClick = (collectionId) => {
    navigate(`/collection/${collectionId}`);
  };

  useEffect(() => {
    if (collections.length > 0) {
      detectAndSetDuplicates(collections);
    }
  }, [settings.prioritizeBySize, settings.duplicateMatchFields, detectAndSetDuplicates]);

  useEffect(() => {
    fetchCollections();
  }, [refreshTrigger]);

  const duplicateCount = Array.from(duplicateMap.values()).filter(d => d.isDuplicate).length;
  
  // Calculate percentages
  const seenPercentage = stats ? Math.round((stats.seenSaves / (stats.totalSaves || 1)) * 100) : 0;
  const favoritePercentage = stats ? Math.round(((stats.favoriteSaves || 0) / (stats.totalSaves || 1)) * 100) : 0;
  const duplicatePercentage = stats ? Math.round((duplicateCount / (stats.totalSaves || 1)) * 100) : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <FiLoader className="spinner" />
        <p>Loading your collections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Collections</h3>
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-btn">
          <FiRefreshCw /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="collections-container">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-title-section">
          <FiGrid className="header-icon" />
          <h1>Your Collections</h1>
          <span className="total-count">{stats?.totalCollections || 0} collections</span>
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

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FiFolder />
            </div>
            <div className="stat-content">
              <span className="stat-label">Collections</span>
              <span className="stat-value">{stats.totalCollections}</span>
            </div>
          </div>

          <div className="stat-card total-items">
            <div className="stat-icon">
              <FiBarChart2 />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Items</span>
              <span className="stat-value">{stats.totalSaves}</span>
            </div>
          </div>

          <div className="stat-card seen">
            <div className="stat-icon">
              <FiEye />
            </div>
            <div className="stat-content">
              <span className="stat-label">Seen</span>
              <span className="stat-value">{stats.seenSaves}</span>
              <span className="stat-percent">{seenPercentage}%</span>
            </div>
          </div>

          <div className="stat-card favorites">
            <div className="stat-icon">
              <FiHeart />
            </div>
            <div className="stat-content">
              <span className="stat-label">Favorites</span>
              <span className="stat-value">{stats.favoriteSaves || 0}</span>
              <span className="stat-percent">{favoritePercentage}%</span>
            </div>
          </div>

          {settings.showDuplicates && duplicateCount > 0 && (
            <div className="stat-card duplicates">
              <div className="stat-icon">
                <FiCopy />
              </div>
              <div className="stat-content">
                <span className="stat-label">Duplicates</span>
                <span className="stat-value">{duplicateCount}</span>
                <span className="stat-percent">{duplicatePercentage}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Actions */}
      <BatchCollectionActions
        collections={collections}
        onComplete={handleRefresh}
      />

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="empty-state enhanced">
          <div className="empty-icon">📁</div>
          <h3>No collections yet</h3>
          <p>Upload your Facebook data to get started</p>
          <button 
            className="primary-btn"
            onClick={() => navigate('/upload')}
          >
            Upload Data
          </button>
        </div>
      ) : (
        <>
          <div className="collections-grid">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.fbid || collection._id}
                collection={collection}
                onCollectionClick={handleCollectionClick}
                onDelete={async (collection) => {
                  try {
                    await deleteCollection(collection.fbid);
                    toast.success(`Deleted collection: ${collection.title}`);
                    await fetchCollections();
                  } catch (error) {
                    toast.error(error.message || 'Failed to delete collection');
                  }
                }}
                onUpdate={handleRefresh}
              />
            ))}
          </div>
          
          {/* Quick stats footer */}
          <div className="collections-footer">
            <div className="footer-stats">
              <span>
                <strong>{stats?.totalSaves || 0}</strong> total items
              </span>
              <span className="separator">•</span>
              <span>
                <strong>{stats?.totalCollections || 0}</strong> collections
              </span>
              <span className="separator">•</span>
              <span>
                <strong>{Math.round((stats?.totalSaves || 0) / (stats?.totalCollections || 1))}</strong> avg items per collection
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionsList;