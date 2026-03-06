import React, { useState, useEffect } from 'react';
import { FiCopy, FiTrash2, FiEye, FiFolderMove, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useSettings } from '../contexts/SettingsContext';
import { getDuplicatesByOriginal } from '../utils/duplicateDetector';
import { bulkDeleteSaves, moveItem } from '../api';
import './Styles.css';

const DuplicateManager = ({ collections, duplicateMap, onUpdate, onClose }) => {
  const { settings } = useSettings();
  const [groupedDuplicates, setGroupedDuplicates] = useState(new Map());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (collections.length > 0) {
      const grouped = getDuplicatesByOriginal(collections, duplicateMap);
      setGroupedDuplicates(grouped);
    }
  }, [collections, duplicateMap]);

  const handleDeleteAllDuplicates = async (originalKey) => {
    const duplicates = groupedDuplicates.get(originalKey);
    if (!duplicates || duplicates.length === 0) return;

    setProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const dup of duplicates) {
        try {
          const response = await bulkDeleteSaves({
            items: [{
              collectionId: dup.collectionId,
              saveIndex: dup.saveIndex,
              url: dup.item?.url
            }]
          });
          
          if (response.data.success && response.data.deletedCount > 0) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Failed to delete duplicate:', error);
          errorCount++;
        }
      }
      
      if (errorCount === 0) {
        toast.success(`Deleted ${successCount} duplicates`);
      } else if (successCount > 0) {
        toast.warning(`Deleted ${successCount} duplicates, ${errorCount} failed`);
      } else {
        toast.error('Failed to delete duplicates');
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete duplicates:', error);
      toast.error('Failed to delete duplicates');
    } finally {
      setProcessing(false);
    }
  };

  const handleMoveToOriginal = async (originalKey) => {
    const duplicates = groupedDuplicates.get(originalKey);
    if (!duplicates || duplicates.length === 0) return;

    setProcessing(true);
    try {
      const [originalCollectionId, originalIndex] = originalKey.split('-');
      const originalCollection = collections.find(c => c.fbid === originalCollectionId);
      
      if (!originalCollection) {
        toast.error('Original collection not found');
        return;
      }

      for (const dup of duplicates) {
        await moveItem(
          dup.collectionId,
          originalCollectionId,
          dup.saveIndex
        );
      }

      toast.success(`Moved ${duplicates.length} duplicates to original collection`);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to move duplicates');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="duplicate-manager">
      <div className="manager-header">
        <h3>
          <FiCopy className="header-icon" />
          Duplicate Manager
        </h3>
        <button className="close-btn" onClick={onClose}>
          <FiX />
        </button>
      </div>

      <div className="manager-content">
        {groupedDuplicates.size === 0 ? (
          <div className="no-duplicates">
            <p>No duplicates found</p>
          </div>
        ) : (
          <div className="duplicate-groups">
            {Array.from(groupedDuplicates.entries()).map(([key, duplicates]) => {
              const [collectionId, index] = key.split('-');
              const originalCollection = collections.find(c => c.fbid === collectionId);
              const originalItem = originalCollection?.saves?.[index];

              return (
                <div key={key} className="duplicate-group">
                  <div className="group-header">
                    <div className="original-info">
                      <strong>Original:</strong>
                      <span className="original-title">
                        {originalItem?.title || originalItem?.name || 'Untitled'}
                      </span>
                      <span className="original-location">
                        in "{originalCollection?.title}"
                      </span>
                    </div>
                    <div className="group-actions">
                      <button
                        className="action-btn move"
                        onClick={() => handleMoveToOriginal(key)}
                        disabled={processing}
                        title="Move all duplicates to original collection"
                      >
                        <FiFolderMove />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteAllDuplicates(key)}
                        disabled={processing}
                        title="Delete all duplicates"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  <div className="duplicates-list">
                    {duplicates.map((dup, idx) => (
                      <div key={idx} className="duplicate-item">
                        <FiCopy className="duplicate-icon" />
                        <span className="duplicate-title">
                          {dup.item?.title || dup.item?.name || 'Untitled'}
                        </span>
                        <span className="duplicate-location">
                          in "{dup.originalCollectionTitle}"
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicateManager;