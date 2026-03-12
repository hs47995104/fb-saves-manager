// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SelectionProvider } from './contexts/SelectionContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Uploader from './components/Uploader';
import CollectionsList from './components/CollectionsList';
import CollectionView from './components/CollectionView';
import AllItemsView from './components/AllItemsView';
import FavoritesView from './components/FavoritesView';
import TagsView from './components/TagsView';
import SettingsModal from './components/SettingsModal';
import SeenRecentlyView from './components/SeenRecentlyView';
import ReelsView from './components/ReelsView';
import Header from './components/Header';
import './App.css';
import './components/Styles.css';

// Create a wrapper component that uses hooks
function AppContent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCollectionUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  return (
    <SelectionProvider>
      <SettingsProvider>
        <div className="app">
          <Header onSettingsClick={() => setShowSettings(true)} />

          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/" 
                element={
                  <PrivateRoute>
                    <Navigate to="/collections" replace />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/collections" 
                element={
                  <PrivateRoute>
                    <CollectionsList refreshTrigger={refreshTrigger} />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/collection/:collectionId" 
                element={
                  <PrivateRoute>
                    <CollectionView onUpdate={handleCollectionUpdate} />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/all-items" 
                element={
                  <PrivateRoute>
                    <AllItemsView onUpdate={handleCollectionUpdate} />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/reels" 
                element={
                  <PrivateRoute>
                    <ReelsView onUpdate={handleCollectionUpdate} />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/seen-recently" 
                element={
                  <PrivateRoute>
                    <SeenRecentlyView onUpdate={handleCollectionUpdate} />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/favorites" 
                element={
                  <PrivateRoute>
                    <FavoritesView onUpdate={handleCollectionUpdate} />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/tags" 
                element={
                  <PrivateRoute>
                    <TagsView onUpdate={handleCollectionUpdate} />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/upload" 
                element={
                  <PrivateRoute>
                    <Uploader onUploadSuccess={handleUploadSuccess} />
                  </PrivateRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/collections" replace />} />
            </Routes>
          </main>

          <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
          />

          <ToastContainer
            position="bottom-center"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={isDarkMode ? 'dark' : 'light'}
            toastClassName="fb-toast"
            className="toast-container"
          />
        </div>
      </SettingsProvider>
    </SelectionProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;