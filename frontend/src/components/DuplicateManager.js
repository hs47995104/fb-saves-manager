// frontend/src/components/DuplicateManager.js - Simplified URL-based duplicate management

import React, { useState, useEffect } from 'react';
import { FiCopy, FiTrash2, FiX, FiExternalLink } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getDuplicatesByOriginal } from '../utils/duplicateDetector';
import { bulkDeleteSaves } from '../api';
import './Styles.css';

const DuplicateManager = ({ collections, duplicateMap, onUpdate, onClose }) => {
  const [groupedDuplicates, setGroupedDuplicates] = useState(new Map());
  const [processing, setProcessing] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  useEffect(() => {
    if (collections.length > 0 && duplicateMap.size > 0) {
      const grouped = getDuplicatesByOriginal(collections, duplicateMap);
      setGroupedDuplicates(grouped);
    }
  }, [collections, duplicateMap]);

  const handleDeleteDuplicates = async (originalKey, duplicates) => {
    if (!duplicates || duplicates.length === 0) return;

    setProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Group duplicates by collection for bulk deletion
      const itemsByCollection = {};
      duplicates.forEach(dup => {
        if (!itemsByCollection[dup.collectionId]) {
          itemsByCollection[dup.collectionId] = [];
        }
        itemsByCollection[dup.collectionId].push({
          collectionId: dup.collectionId,
          saveIndex: dup.saveIndex,
          url: dup.item?.url
        });
      });

      // Delete each group
      for (const [collectionId, items] of Object.entries(itemsByCollection)) {
        try {
          const response = await bulkDeleteSaves({ items });
          if (response.data.success) {
            successCount += items.length;
          } else {
            errorCount += items.length;
          }
        } catch (error) {
          console.error('Failed to delete duplicates from collection:', collectionId, error);
          errorCount += items.length;
        }
      }
      
      if (errorCount === 0) {
        toast.success(`Deleted ${successCount} duplicate${successCount !== 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Deleted ${successCount} duplicate${successCount !== 1 ? 's' : ''}, ${errorCount} failed`);
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

  const toggleGroup = (key) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedGroups(newSelected);
  };

  const selectAll = () => {
    if (selectedGroups.size === groupedDuplicates.size) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groupedDuplicates.keys()));
    }
  };

  const deleteSelected = async () => {
    if (selectedGroups.size === 0) {
      toast.error('No groups selected');
      return;
    }

    setProcessing(true);
    try {
      let totalDeleted = 0;
      let totalErrors = 0;

      for (const key of selectedGroups) {
        const group = groupedDuplicates.get(key);
        if (group?.duplicates) {
          // Group duplicates by collection for this original
          const itemsByCollection = {};
          group.duplicates.forEach(dup => {
            if (!itemsByCollection[dup.collectionId]) {
              itemsByCollection[dup.collectionId] = [];
            }
            itemsByCollection[dup.collectionId].push({
              collectionId: dup.collectionId,
              saveIndex: dup.saveIndex,
              url: dup.item?.url
            });
          });

          // Delete duplicates for this original
          for (const [collectionId, items] of Object.entries(itemsByCollection)) {
            try {
              const response = await bulkDeleteSaves({ items });
              if (response.data.success) {
                totalDeleted += items.length;
              } else {
                totalErrors += items.length;
              }
            } catch (error) {
              totalErrors += items.length;
            }
          }
        }
      }

      if (totalErrors === 0) {
        toast.success(`Deleted ${totalDeleted} duplicate${totalDeleted !== 1 ? 's' : ''}`);
      } else if (totalDeleted > 0) {
        toast.warning(`Deleted ${totalDeleted} duplicate${totalDeleted !== 1 ? 's' : ''}, ${totalErrors} failed`);
      } else {
        toast.error('Failed to delete selected duplicates');
      }

      setSelectedGroups(new Set());
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to delete selected groups');
    } finally {
      setProcessing(false);
    }
  };

  if (groupedDuplicates.size === 0) {
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
          <div className="no-duplicates">
            <FiCopy size={48} />
            <p>No duplicates found based on URLs</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="duplicate-manager">
      <div className="manager-header">
        <h3>
          <FiCopy className="header-icon" />
          Duplicate Manager
        </h3>
        <div className="header-actions">
          <button 
            className="select-all-btn"
            onClick={selectAll}
            disabled={processing}
          >
            {selectedGroups.size === groupedDuplicates.size ? 'Deselect All' : 'Select All'}
          </button>
          {selectedGroups.size > 0 && (
            <button
              className="delete-selected-btn"
              onClick={deleteSelected}
              disabled={processing}
            >
              <FiTrash2 /> Delete Selected ({selectedGroups.size})
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
      </div>

      <div className="manager-content">
        <div className="duplicate-groups">
          {Array.from(groupedDuplicates.entries()).map(([key, group]) => {
            const [collectionId, index] = key.split('-');
            const originalCollection = collections.find(c => c.fbid === collectionId);
            const originalItem = originalCollection?.saves?.[parseInt(index, 10)];

            return (
              <div key={key} className="duplicate-group">
                <div className="group-header">
                  <div className="group-select">
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(key)}
                      onChange={() => toggleGroup(key)}
                      disabled={processing}
                    />
                  </div>
                  <div className="original-info">
                    <strong>Original:</strong>
                    <span className="original-title">
                      {originalItem?.title || originalItem?.name || 'Untitled'}
                    </span>
                    {originalItem?.url && (
                      <a 
                        href={originalItem.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="original-url"
                        title="Open original"
                      >
                        <FiExternalLink />
                      </a>
                    )}
                    <span className="original-location">
                      in "{originalCollection?.title}"
                    </span>
                  </div>
                  <div className="group-actions">
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteDuplicates(key, group.duplicates)}
                      disabled={processing}
                      title="Delete all duplicates for this URL"
                    >
                      <FiTrash2 /> Delete All
                    </button>
                  </div>
                </div>
                <div className="duplicates-list">
                  {group.duplicates.map((dup, idx) => (
                    <div key={idx} className="duplicate-item">
                      <FiCopy className="duplicate-icon" />
                      <span className="duplicate-title">
                        {dup.item?.title || dup.item?.name || 'Untitled'}
                      </span>
                      {dup.item?.url && (
                        <a 
                          href={dup.item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="duplicate-url"
                          title="Open duplicate"
                        >
                          <FiExternalLink />
                        </a>
                      )}
                      <span className="duplicate-location">
                        in "{dup.collectionTitle}"
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DuplicateManager;