import React, { useState } from 'react';
import { 
  FiFolder, 
  FiChevronRight, 
  FiTrash2, 
  FiCheckSquare, 
  FiSquare,
  FiUsers,
  FiCalendar,
  FiHash
} from 'react-icons/fi';
import { useSelection } from '../contexts/SelectionContext';
import DeleteModal from './DeleteModal';
import './Styles.css';

const CollectionCard = ({ 
  collection, 
  onCollectionClick, 
  onDelete,
  onUpdate 
}) => {
  const { toggleItem, isSelected } = useSelection();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const collectionKey = `collection-${collection.fbid}`;
  const selected = isSelected(collectionKey);

  const handleSelectToggle = (e) => {
    e.stopPropagation();
    toggleItem(collectionKey, {
      type: 'collection',
      collection: collection,
      fbid: collection.fbid,
      title: collection.title,
      itemCount: collection.saves?.length || 0
    });
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    await onDelete(collection);
    setShowDeleteModal(false);
  };

  const handleCardClick = () => {
    if (onCollectionClick) {
      onCollectionClick(collection.fbid);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      return new Date(timestamp * 1000).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <>
      <div 
        className={`collection-card ${selected ? 'selected' : ''}`}
        onClick={handleCardClick}
      >
        <div className="collection-header">
          <button 
            className={`select-checkbox ${selected ? 'selected' : ''}`}
            onClick={handleSelectToggle}
            title={selected ? 'Deselect' : 'Select'}
          >
            {selected ? <FiCheckSquare /> : <FiSquare />}
          </button>
          
          <FiFolder className="collection-icon" />
          
          <h3 className="collection-title" title={collection.title}>
            {collection.title || 'Untitled Collection'}
          </h3>
          
          <button
            className="delete-collection-btn"
            onClick={handleDeleteClick}
            title="Delete collection"
          >
            <FiTrash2 />
          </button>
        </div>
        
        <div className="collection-stats">
          <div className="stat-item">
            <FiHash />
            <span>{collection.saves?.length || 0} items</span>
          </div>
          
          <div className="stat-item">
            <FiCalendar />
            <span>{formatDate(collection.timestamp)}</span>
          </div>
          
          {collection.participants?.length > 0 && (
            <div className="stat-item">
              <FiUsers />
              <span>{collection.participants.length} participants</span>
            </div>
          )}
        </div>
        
        {collection.description && (
          <p className="collection-description" title={collection.description}>
            {collection.description.length > 100 
              ? collection.description.substring(0, 100) + '...' 
              : collection.description}
          </p>
        )}
        
        {collection.participants?.length > 0 && (
          <div className="participants-preview">
            {collection.participants.slice(0, 3).map((participant, idx) => (
              <span key={idx} className="participant-tag">
                {participant}
              </span>
            ))}
            {collection.participants.length > 3 && (
              <span className="more-participants">
                +{collection.participants.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="view-indicator">
          <FiChevronRight className="view-icon" />
          <span>View Collection</span>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Collection"
        message={`Are you sure you want to delete "${collection.title || 'this collection'}" and all its ${collection.saves?.length || 0} items?`}
        itemCount={collection.saves?.length || 0}
      />
    </>
  );
};

export default CollectionCard;