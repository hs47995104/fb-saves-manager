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
  const [localSettings, setLocalSettings] = useState(settings);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  // Sync with user settings when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      if (user?.settings) {
        setLocalSettings(user.settings);
        updateSettings(user.settings);
      } else {
        setLocalSettings(settings);
      }
      setError(null);
    }
  }, [isOpen, user, settings, updateSettings]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasChanges(changed);
  }, [localSettings, settings]);

  if (!isOpen) return null;

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

  const handleSelectChange = (key) => (e) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    handleChange(key, value);
  };

  const handleNumberChange = (key) => (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      handleChange(key, value);
    }
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
      prioritizeBySize: true,
      highlightDuplicates: true,
      autoDetectDuplicates: true,
      duplicateMatchFields: ['url', 'title', 'name'],
      showDuplicateCount: true,
      duplicateThreshold: 0.8
    };
    setLocalSettings(defaultSettings);
    setError(null);
    toast.info('Settings reset to defaults');
  };

  const handleCancel = () => {
    // Revert to saved settings
    setLocalSettings(settings);
    setError(null);
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
          {/* User Info Section - Only show if user is logged in */}
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
                  Display duplicate items in your collections
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
                <label>Prioritize by Collection Size</label>
                <span className="setting-description">
                  Items in larger collections are considered originals
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={localSettings.prioritizeBySize}
                  onChange={handleCheckboxChange('prioritizeBySize')}
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

            <div className="setting-item">
              <div className="setting-info">
                <label>Show Duplicate Count</label>
                <span className="setting-description">
                  Display how many duplicates exist for each item
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={localSettings.showDuplicateCount}
                  onChange={handleCheckboxChange('showDuplicateCount')}
                  disabled={saving}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Auto-detect Duplicates</label>
                <span className="setting-description">
                  Automatically detect duplicates when loading data
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={localSettings.autoDetectDuplicates}
                  onChange={handleCheckboxChange('autoDetectDuplicates')}
                  disabled={saving}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-item field-selector">
              <div className="setting-info">
                <label>Match by Fields</label>
                <span className="setting-description">
                  Select which fields to use for duplicate detection
                </span>
              </div>
              <select
                multiple
                value={localSettings.duplicateMatchFields}
                onChange={handleSelectChange('duplicateMatchFields')}
                className="field-select"
                size="3"
                disabled={saving}
              >
                <option value="url">URL</option>
                <option value="title">Title</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Duplicate Threshold</label>
                <span className="setting-description">
                  Similarity threshold for duplicate detection (0.0 - 1.0)
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={localSettings.duplicateThreshold}
                onChange={handleNumberChange('duplicateThreshold')}
                className="threshold-input"
                disabled={saving}
              />
            </div>
          </div>

          <div className="settings-section info-section">
            <h4>
              <FiInfo className="section-icon" />
              How Duplicate Detection Works
            </h4>
            <ul className="info-list">
              <li>• Items are considered duplicates if they have matching URL, title, or name based on selected fields</li>
              <li>• Collections with more items are prioritized as the source of truth</li>
              <li>• When "Show Duplicates" is OFF, only the original item appears in lists</li>
              <li>• When "Show Duplicates" is ON, duplicates are labeled with the source collection</li>
              <li>• Duplicate badges show which collection contains the original item</li>
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