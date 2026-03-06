import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SelectionProvider } from './contexts/SelectionContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Uploader from './components/Uploader';
import CollectionsList from './components/CollectionsList';
import CollectionView from './components/CollectionView';
import AllItemsView from './components/AllItemsView';
import FavoritesView from './components/FavoritesView';
import TagsView from './components/TagsView';
import SettingsModal from './components/SettingsModal';
import { FiSettings } from 'react-icons/fi';
import './App.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('collections');
  const [showSettings, setShowSettings] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('collections');
  };

  const handleCollectionUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <SettingsProvider>
      <SelectionProvider>
        <Router>
          <div className="app">
            <nav className="navbar">
              <div className="navbar-content">
                <div className="nav-brand">
                  <h2>📚 Facebook Saves Manager</h2>
                </div>
                <div className="nav-tabs">
                  <button
                    className={`tab-btn ${activeTab === 'collections' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('collections');
                      window.location.href = '/collections';
                    }}
                  >
                    Collections
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'all-items' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('all-items');
                      window.location.href = '/all-items';
                    }}
                  >
                    All Items
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('favorites');
                      window.location.href = '/favorites';
                    }}
                  >
                    Favorites
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('tags');
                      window.location.href = '/tags';
                    }}
                  >
                    Tags
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('upload');
                      window.location.href = '/upload';
                    }}
                  >
                    Upload Data
                  </button>
                </div>
                <button
                  className="settings-btn"
                  onClick={() => setShowSettings(true)}
                  title="Settings"
                >
                  <FiSettings />
                </button>
              </div>
            </nav>

            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/collections" replace />} />
                <Route 
                  path="/collections" 
                  element={
                    <CollectionsList 
                      refreshTrigger={refreshTrigger} 
                    />
                  } 
                />
                <Route 
                  path="/collection/:collectionId" 
                  element={<CollectionView onUpdate={handleCollectionUpdate} />} 
                />
                <Route 
                  path="/all-items" 
                  element={<AllItemsView onUpdate={handleCollectionUpdate} />} 
                />
                <Route 
                  path="/favorites" 
                  element={<FavoritesView onUpdate={handleCollectionUpdate} />} 
                />
                <Route 
                  path="/tags" 
                  element={<TagsView onUpdate={handleCollectionUpdate} />} 
                />
                <Route 
                  path="/upload" 
                  element={<Uploader onUploadSuccess={handleUploadSuccess} />} 
                />
                <Route path="*" element={<Navigate to="/collections" replace />} />
              </Routes>
            </main>

            <SettingsModal 
              isOpen={showSettings} 
              onClose={() => setShowSettings(false)} 
            />

            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </Router>
      </SelectionProvider>
    </SettingsProvider>
  );
}

export default App;