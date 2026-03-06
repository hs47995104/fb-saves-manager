import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { uploadJSON } from '../api';
import { FiUpload, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './Styles.css';

const Uploader = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size should be less than 50MB');
      return;
    }

    setUploading(true);
    setUploadStats(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      let text = '';
      
      try {
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(arrayBuffer);
        JSON.parse(text);
        console.log('Successfully decoded as UTF-8');
      } catch (e) {
        console.log('UTF-8 decoding failed, trying recovery...');
        
        const bytes = new Uint8Array(arrayBuffer);
        let latin1 = '';
        for (let i = 0; i < bytes.length; i++) {
          latin1 += String.fromCharCode(bytes[i]);
        }
        
        const utf8Bytes = [];
        for (let i = 0; i < latin1.length; i++) {
          utf8Bytes.push(latin1.charCodeAt(i));
        }
        
        const utf8Decoder = new TextDecoder('utf-8');
        text = utf8Decoder.decode(new Uint8Array(utf8Bytes));
        
        JSON.parse(text);
        console.log('Successfully recovered via Latin-1 conversion');
      }
      
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON format after encoding recovery');
      }

      if (!Array.isArray(jsonData)) {
        throw new Error('JSON must be an array of saved items');
      }

      const response = await uploadJSON(text);
      setUploadStats(response.data.stats);
      
      toast.success(`Upload successful! Imported: ${response.data.stats.imported}, Updated: ${response.data.stats.updated}`);
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      event.target.value = '';
    } catch (error) {
      toast.error(error.message || 'Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="uploader-container">
      <div className="uploader-card">
        <div className="uploader-header">
          <h2>Import Facebook Saves</h2>
          <p>Upload your saved_items.json file from Facebook data download</p>
        </div>

        <div className="upload-area">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={uploading}
            id="file-upload"
            className="file-input"
          />
          <label htmlFor="file-upload" className={`file-label ${uploading ? 'disabled' : ''}`}>
            <FiUpload className="upload-icon" />
            <span>{uploading ? 'Uploading...' : 'Choose JSON File'}</span>
          </label>
        </div>

        {uploadStats && (
          <div className="upload-stats">
            <h3>Upload Results</h3>
            <div className="stats-grid">
              <div className="stat-item success">
                <FiCheckCircle />
                <span>Imported: {uploadStats.imported}</span>
              </div>
              <div className="stat-item warning">
                <FiCheckCircle />
                <span>Updated: {uploadStats.updated}</span>
              </div>
              {uploadStats.failed > 0 && (
                <div className="stat-item error">
                  <FiAlertCircle />
                  <span>Failed: {uploadStats.failed}</span>
                </div>
              )}
              <div className="stat-item total">
                <span>Total: {uploadStats.total}</span>
              </div>
            </div>
          </div>
        )}

        <div className="upload-info">
          <h4>How to get your Facebook saved items:</h4>
          <ol>
            <li>Go to Facebook Settings & Privacy</li>
            <li>Click on "Download your information"</li>
            <li>Select "Saved" and choose JSON format</li>
            <li>Download and upload the file here</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Uploader;