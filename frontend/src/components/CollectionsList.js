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
  FiCopy
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
      console.log('Duplicates detected:', duplicateMap.size);
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
      console.log('Collections loaded:', response.data.length);
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
      <div className="collections-header">
        <h1>Your Collections</h1>
        
        {stats && (
          <div className="stats-bar">
            <div className="stat">
              <FiFolder />
              <span>Collections: {stats.totalCollections}</span>
            </div>
            <div className="stat">
              <FiBarChart2 />
              <span>Total Items: {stats.totalSaves}</span>
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
            
            {settings.showDuplicates && duplicateCount > 0 && (
              <div className="stat duplicate-stat">
                <FiCopy />
                <span>Duplicates: {duplicateCount}</span>
                <span className="stat-percent">
                  ({Math.round((duplicateCount / (stats.totalSaves || 1)) * 100)}%)
                </span>
              </div>
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

      <BatchCollectionActions
        collections={collections}
        onComplete={handleRefresh}
      />

      <div className="collections-grid">
        {collections.length === 0 ? (
          <div className="empty-state">
            <FiFolder size={48} />
            <h3>No collections found</h3>
            <p>Upload your Facebook data to get started</p>
            <button 
              className="upload-btn"
              onClick={() => navigate('/upload')}
            >
              Upload Data
            </button>
          </div>
        ) : (
          collections.map((collection) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionsList;