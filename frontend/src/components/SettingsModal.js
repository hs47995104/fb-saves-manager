import React, { useState } from 'react';
import { 
  FiX, 
  FiSettings, 
  FiCopy, 
  FiCheck,
  FiInfo,
  FiRefreshCw
} from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'react-toastify';
import './Styles.css';

const SettingsModal = ({ isOpen, onClose }) => {
  const { settings, updateSetting, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCheckboxChange = (key) => (e) => {
    handleChange(key, e.target.checked);
  };

  const handleSelectChange = (key) => (e) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    handleChange(key, value);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setShowConfirm(true);
    setTimeout(() => setShowConfirm(false), 2000);
    toast.success('Settings saved');
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
    updateSettings(defaultSettings);
    toast.info('Settings reset to defaults');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <FiSettings className="settings-icon" />
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
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
              >
                <option value="url">URL</option>
                <option value="title">Title</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          <div className="settings-section info-section">
            <h4>
              <FiInfo className="section-icon" />
              How Duplicate Detection Works
            </h4>
            <ul className="info-list">
              <li>• Items are considered duplicates if they have matching URL, title, or name</li>
              <li>• Collections with more items are prioritized as the source of truth</li>
              <li>• When "Show Duplicates" is OFF, only the original item appears</li>
              <li>• When "Show Duplicates" is ON, duplicates are labeled with the source collection</li>
              <li>• Duplicate badges show which collection contains the original</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="reset-btn" onClick={handleReset}>
            <FiRefreshCw /> Reset to Defaults
          </button>
          <div className="footer-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleSave}>
              {showConfirm ? <FiCheck /> : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;