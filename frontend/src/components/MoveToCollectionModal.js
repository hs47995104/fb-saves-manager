import React, { useState, useEffect } from 'react';
import { FiX, FiFolder, FiPlus, FiLoader } from 'react-icons/fi';
import { getSimpleCollections, createCollection } from '../api';
import { toast } from 'react-toastify';
import './Styles.css';

const MoveToCollectionModal = ({ 
  isOpen, 
  onClose, 
  onMove, 
  currentCollectionId,
  currentCollectionTitle,
  itemTitle,
  isMultiSelect = false
}) => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen]);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const response = await getSimpleCollections();
      let filtered = response.data;
      if (!isMultiSelect && currentCollectionId !== 'multiple') {
        filtered = response.data.filter(c => c.fbid !== currentCollectionId);
      }
      setCollections(filtered);
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionTitle.trim()) {
      toast.error('Collection title is required');
      return;
    }

    setCreating(true);
    try {
      const response = await createCollection(newCollectionTitle, newCollectionDescription);
      const newCollection = response.data.collection;
      
      setCollections(prev => [...prev, {
        fbid: newCollection.fbid,
        title: newCollection.title,
        itemCount: 0
      }]);
      
      setSelectedCollection(newCollection.fbid);
      
      setNewCollectionTitle('');
      setNewCollectionDescription('');
      setShowNewCollection(false);
      
      toast.success('Collection created');
    } catch (error) {
      toast.error(error.message || 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleMove = async () => {
    if (!selectedCollection) {
      toast.error('Please select a collection');
      return;
    }

    const success = await onMove(selectedCollection);
    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <FiFolder className="move-icon" />
          <h3>{isMultiSelect ? 'Move Multiple Items' : 'Move Item'}</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="item-info">
            <strong>{isMultiSelect ? 'Moving:' : 'Moving:'}</strong> {itemTitle}
          </div>
          {!isMultiSelect && currentCollectionId !== 'multiple' && (
            <div className="current-location">
              <strong>From:</strong> {currentCollectionTitle}
            </div>
          )}

          <div className="collection-selector">
            <label>Select destination collection:</label>
            
            {loading ? (
              <div className="loading-collections">
                <FiLoader className="spinner" />
                <span>Loading collections...</span>
              </div>
            ) : (
              <>
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="collection-select"
                >
                  <option value="">-- Choose a collection --</option>
                  {collections.map(collection => (
                    <option key={collection.fbid} value={collection.fbid}>
                      {collection.title} ({collection.itemCount} items)
                    </option>
                  ))}
                </select>

                {!showNewCollection ? (
                  <button
                    className="new-collection-btn"
                    onClick={() => setShowNewCollection(true)}
                  >
                    <FiPlus /> Create New Collection
                  </button>
                ) : (
                  <div className="new-collection-form">
                    <h4>Create New Collection</h4>
                    <input
                      type="text"
                      placeholder="Collection title *"
                      value={newCollectionTitle}
                      onChange={(e) => setNewCollectionTitle(e.target.value)}
                      className="new-collection-input"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newCollectionDescription}
                      onChange={(e) => setNewCollectionDescription(e.target.value)}
                      className="new-collection-input"
                    />
                    <div className="form-actions">
                      <button
                        className="cancel-btn"
                        onClick={() => setShowNewCollection(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="create-btn"
                        onClick={handleCreateCollection}
                        disabled={creating}
                      >
                        {creating ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="move-btn" 
            onClick={handleMove}
            disabled={!selectedCollection || loading}
          >
            {isMultiSelect ? 'Move Items' : 'Move Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveToCollectionModal;