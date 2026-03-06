import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiFolder, 
  FiTrash2, 
  FiUsers,
  FiCalendar,
  FiHash,
  FiCopy,
  FiSearch,
  FiFilter
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useSelection } from '../contexts/SelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import { getAllItems, deleteCollection } from '../api';
import { detectDuplicates, filterItemsByDuplicateSettings, getDuplicateInfo } from '../utils/duplicateDetector';
import ItemCard from './ItemCard';
import BatchActionBar from './BatchActionBar';
import DeleteModal from './DeleteModal';
import './Styles.css';

const CollectionView = ({ onUpdate }) => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { clearSelection } = useSelection();
  const { settings } = useSettings();
  
  const [collection, setCollection] = useState(null);
  const [allCollections, setAllCollections] = useState([]);
  const [duplicateMap, setDuplicateMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeen, setFilterSeen] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCollection();
    clearSelection();
  }, [collectionId, clearSelection]);

  const loadCollection = async () => {
    setLoading(true);
    try {
      const response = await getAllItems();
      const foundCollection = response.data.find(c => c.fbid === collectionId);
      setAllCollections(response.data || []);
      
      if (foundCollection) {
        setCollection(foundCollection);
        
        if (settings.autoDetectDuplicates) {
          const { duplicateMap } = detectDuplicates(response.data || [], settings);
          setDuplicateMap(duplicateMap);
          window.__duplicateMap = duplicateMap;
        }
      } else {
        toast.error('Collection not found');
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to load collection:', error);
      toast.error('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleItemUpdate = async () => {
    await loadCollection();
    if (onUpdate) onUpdate();
  };

  const handleDeleteCollection = async () => {
    setDeleting(true);
    try {
      await deleteCollection(collectionId);
      toast.success('Collection deleted successfully');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Failed to delete collection');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getFilteredSaves = () => {
    if (!collection?.saves) return [];
    
    let filtered = collection.saves.map((save, index) => ({
      save,
      parentId: collection.fbid,
      parentTitle: collection.title,
      saveIndex: index,
      originalItem: save
    }));
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        return (
          (item.save.title && item.save.title.toLowerCase().includes(term)) ||
          (item.save.name && item.save.name.toLowerCase().includes(term)) ||
          (item.save.url && item.save.url.toLowerCase().includes(term))
        );
      });
    }
    
    if (filterSeen !== 'all') {
      const seenValue = filterSeen === 'seen';
      filtered = filtered.filter(item => item.save.seen === seenValue);
    }
    
    if (!settings.showDuplicates) {
      filtered = filtered.filter(item => {
        const dupInfo = getDuplicateInfo(collection.fbid, item.saveIndex, duplicateMap);
        return !dupInfo?.isDuplicate;
      });
    }
    
    return filtered;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      return new Date(timestamp * 1000).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getCollectionDuplicateStats = () => {
    if (!collection?.saves) return { total: 0, inThisCollection: 0 };
    
    let duplicatesInThisCollection = 0;
    let totalDuplicates = 0;
    
    collection.saves.forEach((_, index) => {
      const dupInfo = getDuplicateInfo(collection.fbid, index, duplicateMap);
      if (dupInfo?.isDuplicate) {
        duplicatesInThisCollection++;
        totalDuplicates++;
      } else if (dupInfo?.isOriginal && dupInfo.duplicateCount > 0) {
        totalDuplicates += dupInfo.duplicateCount;
      }
    });
    
    return { 
      inThisCollection: duplicatesInThisCollection,
      total: totalDuplicates 
    };
  };

  const filteredSaves = getFilteredSaves();
  const duplicateStats = getCollectionDuplicateStats();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading collection...</p>
      </div>
    );
  }

  if (!collection) return null;

  return (
    <div className="collection-view">
      <div className="collection-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FiArrowLeft /> Back to Collections
        </button>
        
        <div className="collection-info">
          <div className="title-section">
            <FiFolder className="folder-icon" />
            <h1>{collection.title || 'Untitled Collection'}</h1>
          </div>
          
          {collection.description && (
            <p className="description">{collection.description}</p>
          )}
          
          <div className="meta-info">
            <div className="meta-item">
              <FiCalendar />
              <span>{formatDate(collection.timestamp)}</span>
            </div>
            <div className="meta-item">
              <FiHash />
              <span>{collection.saves?.length || 0} items</span>
            </div>
            {collection.participants?.length > 0 && (
              <div className="meta-item">
                <FiUsers />
                <span>{collection.participants.length} participants</span>
              </div>
            )}
            
            {settings.showDuplicates && duplicateStats.total > 0 && (
              <div className="meta-item duplicate-count">
                <FiCopy />
                <span>
                  {duplicateStats.inThisCollection} duplicate{duplicateStats.inThisCollection !== 1 ? 's' : ''} in this collection
                  {duplicateStats.total > duplicateStats.inThisCollection && 
                    ` (${duplicateStats.total} total across collections)`
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="collection-actions">
          <button
            className="delete-collection-btn"
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
          >
            <FiTrash2 /> Delete Collection
          </button>
        </div>
      </div>

      {collection.participants?.length > 0 && (
        <div className="participants-bar">
          <strong>Participants:</strong>
          <div className="participants-list">
            {collection.participants.map((participant, index) => (
              <span key={index} className="participant-tag">
                {participant}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="filter-bar">
        <button 
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter />
          Filters
        </button>
        
        {showFilters && (
          <div className="filters-panel">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search in this collection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <select 
              className="filter-select"
              value={filterSeen} 
              onChange={(e) => setFilterSeen(e.target.value)}
            >
              <option value="all">All Items</option>
              <option value="seen">Seen</option>
              <option value="unseen">Unseen</option>
            </select>

            {settings.showDuplicates && duplicateStats.inThisCollection > 0 && (
              <div className="duplicate-info">
                <FiCopy />
                <span>
                  {settings.showDuplicates 
                    ? `Showing ${duplicateStats.inThisCollection} duplicates`
                    : `${duplicateStats.inThisCollection} duplicates hidden`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <BatchActionBar
        items={filteredSaves.map(item => ({
          save: item.save,
          parentId: collection.fbid,
          parentTitle: collection.title,
          saveIndex: item.saveIndex
        }))}
        onComplete={handleItemUpdate}
      />

      {filteredSaves.length === 0 ? (
        <div className="empty-state">
          <FiFolder size={48} />
          <h3>No items in this collection</h3>
          {searchTerm || filterSeen !== 'all' ? (
            <>
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
            </>
          ) : (
            <>
              <p>This collection is empty. Move items here from other collections.</p>
              {settings.showDuplicates && duplicateStats.inThisCollection > 0 && !settings.showDuplicates && (
                <p className="duplicate-note">
                  <FiCopy /> {duplicateStats.inThisCollection} duplicate items are hidden. 
                  Enable "Show Duplicates" in settings to view them.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="items-grid">
          {filteredSaves.map((item) => (
            <ItemCard
              key={`${item.save.url}-${item.saveIndex}`}
              item={item.save}
              parentId={collection.fbid}
              parentTitle={collection.title}
              saveIndex={item.saveIndex}
              onUpdate={handleItemUpdate}
            />
          ))}
        </div>
      )}

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteCollection}
        title="Delete Collection"
        message={`Are you sure you want to delete "${collection.title}" and all its ${collection.saves?.length || 0} items?`}
        itemCount={collection.saves?.length || 0}
      />
    </div>
  );
};

export default CollectionView;