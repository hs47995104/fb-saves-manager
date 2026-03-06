import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import './Styles.css';

const DeleteModal = ({ isOpen, onClose, onConfirm, title, message, itemCount }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <FiAlertTriangle className="warning-icon" />
          <h3>{title || 'Confirm Delete'}</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <p>{message || 'Are you sure you want to delete this item?'}</p>
          {itemCount > 0 && (
            <p className="item-count">
              This will delete <strong>{itemCount}</strong> item{itemCount !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="delete-btn" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;