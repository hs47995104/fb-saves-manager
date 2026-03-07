import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SelectionProvider } from './contexts/SelectionContext';
import { SettingsProvider } from './contexts/SettingsContext';
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
import { 
  FiHome, 
  FiBookmark, 
  FiHeart,
  FiEye, 
  FiTag, 
  FiUpload,
  FiSettings,
  FiLogOut,
  FiUser,
  FiMenu,
  FiX
} from 'react-icons/fi';
import './App.css';
import './components/Styles.css';

// Create a wrapper component that uses useLocation
function AppContentWithRouter() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('collections');
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/collections' || path === '/') {
      setActiveTab('collections');
    } else if (path === '/all-items') {
      setActiveTab('all-items');
    } else if (path === '/seen-recently') {
      setActiveTab('seen-recently');
    } else if (path === '/favorites') {
      setActiveTab('favorites');
    } else if (path === '/tags') {
      setActiveTab('tags');
    } else if (path === '/upload') {
      setActiveTab('upload');
    } else if (path.startsWith('/collection/')) {
      setActiveTab('collections');
    }
    
    // Close mobile menu on route change
    setMobileMenuOpen(false);
  }, [location]);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('collections');
  };

  const handleCollectionUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTabClick = (tabId, path) => {
    setActiveTab(tabId);
    window.location.href = path;
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const tabs = [
    { id: 'collections', label: 'Collections', icon: <FiHome />, path: '/collections' },
    { id: 'all-items', label: 'All Items', icon: <FiBookmark />, path: '/all-items' },
    { id: 'seen-recently', label: 'Seen Recently', icon: <FiEye />, path: '/seen-recently' },
    { id: 'favorites', label: 'Favorites', icon: <FiHeart />, path: '/favorites' },
    { id: 'tags', label: 'Tags', icon: <FiTag />, path: '/tags' },
    { id: 'upload', label: 'Upload', icon: <FiUpload />, path: '/upload' }
  ];

  return (
    <SelectionProvider>
      <SettingsProvider>
        <div className="app">
          <nav className="navbar">
            <div className="navbar-content">
              <div className="nav-brand">
                <h2>saves</h2>
                {user && (
                  <button 
                    className="mobile-menu-toggle"
                    onClick={toggleMobileMenu}
                    aria-label="Toggle menu"
                  >
                    {mobileMenuOpen ? <FiX /> : <FiMenu />}
                  </button>
                )}
              </div>

              {user && (
                <div className={`nav-tabs ${mobileMenuOpen ? 'expanded' : ''}`}>
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => handleTabClick(tab.id, tab.path)}
                      title={tab.label}
                    >
                      <span className="tab-icon">{tab.icon}</span>
                      <span className="tab-label">{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="nav-right">
                {user ? (
                  <>
                    <div className="user-info">
                      <FiUser />
                      <span className="username">{user.username}</span>
                    </div>
                    <button
                      className="settings-btn"
                      onClick={() => setShowSettings(true)}
                      title="Settings"
                    >
                      <FiSettings />
                    </button>
                    <button
                      className="logout-btn"
                      onClick={logout}
                      title="Logout"
                    >
                      <FiLogOut />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </nav>

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
            theme="light"
            toastClassName="fb-toast"
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
        <AppContentWithRouter />
      </AuthProvider>
    </Router>
  );
}

export default App;