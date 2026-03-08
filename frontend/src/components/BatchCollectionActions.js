import React, { useState } from 'react';
import { 
  FiCheckSquare, 
  FiSquare, 
  FiTrash2, 
  FiX,
  FiLoader
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useSelection } from '../contexts/SelectionContext';
import { deleteCollection } from '../api';
import DeleteModal from './DeleteModal';
import './Styles.css';

const BatchCollectionActions = ({ 
  collections = [], 
  onComplete 
}) => {
  const { 
    selectedItems, 
    selectionMode, 
    clearSelection, 
    selectAll, 
    getSelectedItemsList,
    getSelectedCount,
    toggleItem,
    isSelected
  } = useSelection();

  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const allSelected = collections.length > 0 && 
    collections.every(collection => {
      const collectionKey = `collection-${collection.fbid}`;
      return isSelected(collectionKey);
    });
  
  const someSelected = collections.length > 0 && 
    collections.some(collection => {
      const collectionKey = `collection-${collection.fbid}`;
      return isSelected(collectionKey);
    }) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      collections.forEach(collection => {
        const collectionKey = `collection-${collection.fbid}`;
        if (isSelected(collectionKey)) {
          toggleItem(collectionKey);
        }
      });
    } else {
      const itemsToSelect = collections.map(collection => {
        const collectionKey = `collection-${collection.fbid}`;
        const collectionData = {
          type: 'collection',
          collection: collection,
          fbid: collection.fbid,
          title: collection.title,
          itemCount: collection.saves?.length || 0
        };
        return {
          key: collectionKey,
          value: collectionData
        };
      });
      
      selectAll(itemsToSelect);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const selectedList = getSelectedItemsList();
      
      if (selectedList.length === 0) {
        toast.error('No collections selected');
        setLoading(false);
        return;
      }
      
      let deletedCount = 0;
      let errorCount = 0;
      let errorMessages = [];

      for (const item of selectedList) {
        if (item.type === 'collection') {
          try {
            const response = await deleteCollection(item.fbid);
            if (response.data.success) {
              deletedCount++;
            } else {
              errorCount++;
              errorMessages.push(`"${item.title}": ${response.data.error || 'Unknown error'}`);
            }
          } catch (error) {
            errorCount++;
            errorMessages.push(`"${item.title}": ${error.message}`);
          }
        }
      }

      if (errorCount > 0) {
        if (errorCount === selectedList.length) {
          toast.error(`Failed to delete collections: ${errorMessages.join('; ')}`);
        } else {
          toast.warning(
            `Deleted ${deletedCount} collections, ${errorCount} failed: ${errorMessages.join('; ')}`
          );
        }
      } else {
        toast.success(`Successfully deleted ${deletedCount} collections`);
      }

      setShowDeleteModal(false);
      clearSelection();
      if (onComplete) onComplete();
    } catch (error) {
      toast.error(error.message || 'Failed to delete collections');
    } finally {
      setLoading(false);
    }
  };

  if (collections.length === 0) {
    return null;
  }

  if (getSelectedCount() === 0) {
    return (
      <div className="batch-actions-minimal">
        <button 
          className="select-all-btn"
          onClick={handleSelectAll}
        >
          <FiSquare /> Select All Collections ({collections.length})
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="batch-actions-bar">
        <div className="selection-info">
          <button 
            className="select-toggle"
            onClick={handleSelectAll}
            title={allSelected ? "Deselect all" : "Select all"}
          >
            {allSelected ? <FiCheckSquare /> : 
             someSelected ? <FiSquare style={{ opacity: 0.5 }} /> : 
             <FiSquare />}
          </button>
          <span className="selected-count">
            {getSelectedCount()} collection{getSelectedCount() !== 1 ? 's' : ''} selected
          </span>
          <button 
            className="clear-selection"
            onClick={clearSelection}
            title="Clear selection"
          >
            <FiX />
          </button>
        </div>

        <div className="batch-actions">
          <button
            className="action-btn delete"
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            title="Delete selected collections"
          >
            <FiTrash2 /> Delete
          </button>
        </div>

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${getSelectedCount()} Collection${getSelectedCount() !== 1 ? 's' : ''}`}
        message={`Are you sure you want to delete ${getSelectedCount()} collection${getSelectedCount() !== 1 ? 's' : ''} and all their items? This action cannot be undone.`}
        itemCount={getSelectedItemsList().reduce((total, item) => total + (item.itemCount || 0), 0)}
      />
    </>
  );
};

export default BatchCollectionActions;