// frontend/src/components/SettingsModal.js - Fixed infinite loop issue

import React, { useState, useEffect } from 'react';
import { 
  FiX, 
  FiSettings, 
  FiCopy, 
  FiCheck,
  FiInfo,
  FiRefreshCw,
  FiSave,
  FiAlertCircle
} from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './Styles.css';

const SettingsModal = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings();
  const { user, updateUserSettings } = useAuth();
  const [localSettings, setLocalSettings] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  // Initialize local settings when modal opens
  useEffect(() => {
    if (isOpen) {
      // Use user settings if available, otherwise use context settings
      const initialSettings = user?.settings || settings;
      setLocalSettings(initialSettings);
      setError(null);
      setHasChanges(false);
    }
  }, [isOpen, user, settings]);

  // Track changes
  useEffect(() => {
    if (localSettings && settings) {
      const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
      setHasChanges(changed);
    }
  }, [localSettings, settings]);

  if (!isOpen || !localSettings) return null;

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setError(null);
  };

  const handleCheckboxChange = (key) => (e) => {
    handleChange(key, e.target.checked);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Update local context
      updateSettings(localSettings);
      
      // Sync with backend if user is logged in
      if (user) {
        const success = await updateUserSettings(localSettings);
        if (!success) {
          throw new Error('Failed to save settings to server');
        }
      }
      
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2000);
      toast.success('Settings saved successfully');
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save settings');
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultSettings = {
      showDuplicates: false,
      highlightDuplicates: true
    };
    setLocalSettings(defaultSettings);
    setError(null);
    toast.info('Settings reset to defaults');
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <FiSettings className="settings-icon" />
          <h3>Settings</h3>
          <button className="close-btn" onClick={handleCancel} disabled={saving}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {user && (
            <div className="settings-section user-info-section">
              <h4>Account</h4>
              <div className="user-info-display">
                <div className="info-row">
                  <span className="info-label">Username:</span>
                  <span className="info-value">{user.username}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{user.email}</span>
                </div>
              </div>
            </div>
          )}

          <div className="settings-section">
            <h4>
              <FiCopy className="section-icon" />
              Duplicate Management
            </h4>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Show Duplicates</label>
                <span className="setting-description">
                  Display duplicate items in your collections (based on URLs)
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={localSettings.showDuplicates}
                  onChange={handleCheckboxChange('showDuplicates')}
                  disabled={saving}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Highlight Duplicates</label>
                <span className="setting-description">
                  Show duplicate badges with visual indicators
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={localSettings.highlightDuplicates}
                  onChange={handleCheckboxChange('highlightDuplicates')}
                  disabled={saving}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="settings-section info-section">
            <h4>
              <FiInfo className="section-icon" />
              How Duplicate Detection Works
            </h4>
            <ul className="info-list">
              <li>• Items are considered duplicates if they have the same URL</li>
              <li>• URLs are normalized (trailing slashes removed, tracking parameters ignored)</li>
              <li>• Collections with more items are prioritized as the source of truth</li>
              <li>• When "Show Duplicates" is OFF, only the original item appears in lists</li>
              <li>• When "Show Duplicates" is ON, duplicates are labeled with the source collection</li>
              <li>• Settings are saved to your account and synced across devices</li>
            </ul>
          </div>

          {hasChanges && (
            <div className="settings-section unsaved-changes">
              <FiAlertCircle className="warning-icon" />
              <span>You have unsaved changes</span>
            </div>
          )}

          {error && (
            <div className="settings-section error-message">
              <FiAlertCircle className="error-icon" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="reset-btn" 
            onClick={handleReset}
            disabled={saving}
          >
            <FiRefreshCw className={saving ? 'spin' : ''} /> 
            Reset to Defaults
          </button>
          <div className="footer-actions">
            <button 
              className="cancel-btn" 
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              className={`save-btn ${showConfirm ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {showConfirm ? (
                <>
                  <FiCheck /> Saved!
                </>
              ) : saving ? (
                <>
                  <FiRefreshCw className="spin" /> Saving...
                </>
              ) : (
                <>
                  <FiSave /> Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;