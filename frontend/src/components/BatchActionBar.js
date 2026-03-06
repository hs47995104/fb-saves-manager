import React, { useState } from 'react';
import { 
  FiCheckSquare, 
  FiSquare, 
  FiTrash2, 
  FiEye, 
  FiEyeOff, 
  FiHeart, 
  FiFolderPlus,
  FiX,
  FiLoader
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useSelection } from '../contexts/SelectionContext';
import { bulkUpdateSeen, bulkUpdateFavorite, bulkDeleteSaves, moveItem } from '../api';
import DeleteModal from './DeleteModal';
import MoveToCollectionModal from './MoveToCollectionModal';
import './Styles.css';

const BatchActionBar = ({ 
  items = [], 
  onComplete,
  showSelectAll = true,
  showMove = true,
  showSeen = true,
  showFavorite = true,
  showDelete = true
}) => {
  const { 
    selectedItems, 
    selectionMode, 
    clearSelection, 
    selectAll, 
    getSelectedItemsList,
    getSelectedCount,
    toggleItem
  } = useSelection();

  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const allSelected = items.length > 0 && getSelectedCount() === items.length;
  const someSelected = getSelectedCount() > 0 && getSelectedCount() < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      items.forEach((item, index) => {
        const itemKey = `${item.parentFbid || item.parentId}-${item.saveIndex || index}`;
        if (selectedItems.has(itemKey)) {
          toggleItem(itemKey);
        }
      });
    } else {
      selectAll(items);
    }
  };

  const handleBulkSeen = async (seen) => {
    setLoading(true);
    try {
      const selectedList = getSelectedItemsList();
      
      const itemsByCollection = {};
      selectedList.forEach(item => {
        const collectionId = item.parentFbid || item.parentId;
        if (!itemsByCollection[collectionId]) {
          itemsByCollection[collectionId] = [];
        }
        itemsByCollection[collectionId].push({
          saveIndex: item.saveIndex,
          save: item.save || item
        });
      });

      let updatedCount = 0;
      for (const [collectionId, items] of Object.entries(itemsByCollection)) {
        for (const item of items) {
          await bulkUpdateSeen(collectionId, [item.saveIndex], seen);
          updatedCount++;
        }
      }

      toast.success(`Marked ${updatedCount} items as ${seen ? 'seen' : 'unseen'}`);
      clearSelection();
      if (onComplete) onComplete();
    } catch (error) {
      toast.error(error.message || 'Failed to update items');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkFavorite = async (favorite) => {
    setLoading(true);
    try {
      const selectedList = getSelectedItemsList();
      
      const itemsByCollection = {};
      selectedList.forEach(item => {
        const collectionId = item.parentFbid || item.parentId;
        if (!itemsByCollection[collectionId]) {
          itemsByCollection[collectionId] = [];
        }
        itemsByCollection[collectionId].push({
          saveIndex: item.saveIndex,
          save: item.save || item
        });
      });

      let updatedCount = 0;
      for (const [collectionId, items] of Object.entries(itemsByCollection)) {
        for (const item of items) {
          await bulkUpdateFavorite(collectionId, [item.saveIndex], favorite);
          updatedCount++;
        }
      }

      toast.success(`${favorite ? 'Added to' : 'Removed from'} favorites: ${updatedCount} items`);
      clearSelection();
      if (onComplete) onComplete();
    } catch (error) {
      toast.error(error.message || 'Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const selectedList = getSelectedItemsList();
      
      if (selectedList.length === 0) {
        toast.error('No items selected');
        return;
      }

      console.log('Bulk deleting items:', selectedList);
      
      const deleteCriteria = {
        items: selectedList.map(item => {
          const collectionId = item.parentFbid || item.parentId;
          const saveIndex = item.saveIndex;
          const save = item.save || item;
          
          return {
            collectionId: collectionId,
            saveIndex: saveIndex,
            url: save.url || ''
          };
        }).filter(item => item.collectionId && item.saveIndex !== undefined)
      };

      if (deleteCriteria.items.length === 0) {
        toast.error('No valid items to delete');
        setLoading(false);
        return;
      }

      console.log('Delete criteria:', deleteCriteria);
      
      const response = await bulkDeleteSaves(deleteCriteria);
      console.log('Bulk delete response:', response.data);
      
      if (response.data.success) {
        toast.success(`Deleted ${response.data.deletedCount} items`);
        setShowDeleteModal(false);
        clearSelection();
        if (onComplete) onComplete();
      } else {
        toast.error(response.data.error || 'Failed to delete items');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error.message || 'Failed to delete items. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMove = async (targetCollectionId) => {
    setLoading(true);
    try {
      const selectedList = getSelectedItemsList();
      let movedCount = 0;

      for (const item of selectedList) {
        const sourceId = item.parentFbid || item.parentId;
        await moveItem(
          sourceId, 
          targetCollectionId, 
          item.saveIndex,
          (item.save || item).url
        );
        movedCount++;
      }

      toast.success(`Moved ${movedCount} items to new collection`);
      setShowMoveModal(false);
      clearSelection();
      if (onComplete) onComplete();
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to move items');
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (!selectionMode || getSelectedCount() === 0) {
    return showSelectAll && items.length > 0 ? (
      <div className="batch-action-bar minimal">
        <button 
          className="select-all-btn"
          onClick={handleSelectAll}
        >
          <FiSquare /> Select All ({items.length})
        </button>
      </div>
    ) : null;
  }

  return (
    <>
      <div className="batch-action-bar active">
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
            {getSelectedCount()} selected
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
          {showSeen && (
            <>
              <button
                className="action-btn seen"
                onClick={() => handleBulkSeen(true)}
                disabled={loading}
                title="Mark as seen"
              >
                <FiEye /> Mark Seen
              </button>
              <button
                className="action-btn unseen"
                onClick={() => handleBulkSeen(false)}
                disabled={loading}
                title="Mark as unseen"
              >
                <FiEyeOff /> Mark Unseen
              </button>
            </>
          )}

          {showFavorite && (
            <>
              <button
                className="action-btn favorite"
                onClick={() => handleBulkFavorite(true)}
                disabled={loading}
                title="Add to favorites"
              >
                <FiHeart /> Add to Fav
              </button>
              <button
                className="action-btn unfavorite"
                onClick={() => handleBulkFavorite(false)}
                disabled={loading}
                title="Remove from favorites"
              >
                <FiHeart style={{ opacity: 0.5 }} /> Remove Fav
              </button>
            </>
          )}

          {showMove && (
            <button
              className="action-btn move"
              onClick={() => setShowMoveModal(true)}
              disabled={loading}
              title="Move to collection"
            >
              <FiFolderPlus /> Move
            </button>
          )}

          {showDelete && (
            <button
              className="action-btn delete"
              onClick={() => setShowDeleteModal(true)}
              disabled={loading}
              title="Delete selected"
            >
              <FiTrash2 /> Delete
            </button>
          )}
        </div>

        {loading && (
          <div className="loading-indicator">
            <FiLoader className="spin" />
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${getSelectedCount()} Items`}
        message={`Are you sure you want to delete ${getSelectedCount()} items? This action cannot be undone.`}
        itemCount={getSelectedCount()}
      />

      <MoveToCollectionModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleBulkMove}
        currentCollectionId="multiple"
        currentCollectionTitle="Multiple Collections"
        itemTitle={`${getSelectedCount()} selected items`}
        isMultiSelect={true}
      />
    </>
  );
};

export default BatchActionBar;