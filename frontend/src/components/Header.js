// frontend/src/components/Header.js (updated with theme toggle)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  FiX,
  FiChevronDown,
  FiSun,
  FiMoon,
  FiFilm
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Header.css';

const Header = ({ onSettingsClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('collections');
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const headerRef = useRef(null);
  const userMenuRef = useRef(null);

  // Find the navItems array and add a new item for reels
  const navItems = [
    { id: 'collections', label: 'Collections', icon: <FiHome />, path: '/collections' },
    { id: 'all-items', label: 'All Items', icon: <FiBookmark />, path: '/all-items' },
    { id: 'reels', label: 'Reels', icon: <FiFilm />, path: '/reels' }, // Add this line
    { id: 'seen-recently', label: 'Recently Seen', icon: <FiEye />, path: '/seen-recently' },
    { id: 'favorites', label: 'Favorites', icon: <FiHeart />, path: '/favorites' },
    { id: 'tags', label: 'Tags', icon: <FiTag />, path: '/tags' },
    { id: 'upload', label: 'Upload', icon: <FiUpload />, path: '/upload' }
  ];

  // In the useEffect for active tab, add reels case
  useEffect(() => {
    const path = location.pathname;
    if (path === '/collections' || path === '/') {
      setActiveTab('collections');
    } else if (path === '/all-items') {
      setActiveTab('all-items');
    } else if (path === '/reels') {  // Add this
      setActiveTab('reels');
    } else if (path === '/seen-recently') {
      setActiveTab('seen-recently');
    } else if (path === '/favorites') {
      setActiveTab('favorites');
    } else if (path === '/tags') {
      setActiveTab('tags');
    } else if (path === '/upload') {
      setActiveTab('upload');
    }
  }, [location]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (!mobileMenuOpen) {
      setShowUserMenu(false);
    }
  };

  // Don't render header on auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <header 
      ref={headerRef}
      className={`app-header ${scrolled ? 'scrolled' : ''} ${isDarkMode ? 'dark' : 'light'}`}
    >
      <div className="header-container">
        {/* Left section - Logo & Brand */}
        <div className="header-left">
          <div className="brand" onClick={() => navigate('/')}>
            <div className="brand-icon">
              <FiBookmark />
            </div>
            <h1 className="brand-name">
              <span className="brand-saves">saves</span>
              <span className="brand-manager">manager</span>
            </h1>
          </div>
        </div>

        {/* Desktop Navigation (visible on larger screens) */}
        {user && (
          <nav className="desktop-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabClick(item.path)}
                title={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {activeTab === item.id && <span className="active-indicator" />}
              </button>
            ))}
          </nav>
        )}

        {/* Right section - User actions */}
        <div className="header-right">
          {/* Theme Toggle Button */}
          <button 
            className="icon-btn theme-toggle"
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <FiSun /> : <FiMoon />}
          </button>

          {user && (
            <>
              {/* User menu */}
              <div className="user-menu-container" ref={userMenuRef}>
                <button 
                  className="user-menu-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  <div className="user-avatar">
                    <FiUser />
                  </div>
                  <span className="user-name">{user.username}</span>
                  <FiChevronDown className={`chevron ${showUserMenu ? 'open' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-user-info">
                        <strong>{user.username}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        onSettingsClick();
                      }}
                    >
                      <FiSettings /> Settings
                    </button>
                    <button 
                      className="dropdown-item logout"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                    >
                      <FiLogOut /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile menu toggle */}
          {user && (
            <button 
              className="icon-btn mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu (slide-down) */}
      {user && (
        <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <nav className="mobile-nav-items">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabClick(item.path)}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-label">{item.label}</span>
                {activeTab === item.id && <span className="active-indicator" />}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;