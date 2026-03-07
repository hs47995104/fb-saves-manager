// frontend/src/components/ItemCard.js - Fixed with website name extraction
import React, { useState, useEffect } from 'react';
import { 
  FiEye, FiEyeOff, FiExternalLink, FiTrash2, FiFolderPlus, 
  FiHeart, FiTag, FiClock, FiMessageSquare, FiCheckSquare, 
  FiSquare, FiCopy, FiInfo, FiMoreHorizontal,
  FiUser  // Added FiUser here
} from 'react-icons/fi';
import { updateSeen, updateFavorite, deleteSave, moveItem } from '../api';
import { toast } from 'react-toastify';
import { useSelection } from '../contexts/SelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import DeleteModal from './DeleteModal';
import MoveToCollectionModal from './MoveToCollectionModal';
import TagManager from './TagManager';
import CommentSection from './CommentSection';
import './Styles.css';

// Function to extract website name from URL
const getSiteNameFromUrl = (url) => {
  if (!url) return 'Link';
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const cleanHostname = hostname.replace(/^www\./, '');
    const domainParts = cleanHostname.split('.');
    const siteName = domainParts[0];
    const capitalizedSiteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
    
    const specialCases = {
      'youtube': 'YouTube',
      'youtu': 'YouTube',
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'twitter': 'Twitter',
      'x': 'X (Twitter)',
      'linkedin': 'LinkedIn',
      'tiktok': 'TikTok',
      'pinterest': 'Pinterest',
      'reddit': 'Reddit',
      'twitch': 'Twitch',
      'discord': 'Discord',
      'telegram': 'Telegram',
      'whatsapp': 'WhatsApp',
      'spotify': 'Spotify',
      'netflix': 'Netflix',
      'amazon': 'Amazon',
      'ebay': 'eBay',
      'wikipedia': 'Wikipedia',
      'medium': 'Medium',
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'stackoverflow': 'Stack Overflow',
      'quora': 'Quora',
      'vimeo': 'Vimeo',
      'dailymotion': 'Dailymotion',
      'flickr': 'Flickr',
      'imgur': 'Imgur',
      'deviantart': 'DeviantArt',
      'behance': 'Behance',
      'dribbble': 'Dribbble',
      'patreon': 'Patreon',
      'etsy': 'Etsy',
      'shopify': 'Shopify',
      'wordpress': 'WordPress',
      'blogger': 'Blogger',
      'tumblr': 'Tumblr'
    };
    
    const lowerSiteName = siteName.toLowerCase();
    if (specialCases[lowerSiteName]) {
      return specialCases[lowerSiteName];
    }
    
    if (domainParts.length > 2) {
      return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    }
    
    return capitalizedSiteName;
  } catch (error) {
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    if (match) {
      const domain = match[1].split('.')[0];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return 'Link';
  }
};

const getFaviconUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return null;
  }
};

const ItemCard = ({ item, parentId, parentTitle, saveIndex, onUpdate, lastSeenFormatted }) => {
  const { toggleItem, isSelected } = useSelection();
  const { settings } = useSettings();
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comments?.length || 0);
  const [favicon, setFavicon] = useState(null);

  const itemKey = `${parentId}-${saveIndex}`;
  const selected = isSelected(itemKey);

  useEffect(() => {
    if (item.url) {
      setFavicon(getFaviconUrl(item.url));
    }
  }, [item.url]);

  useEffect(() => {
    setCommentCount(item.comments?.length || 0);
  }, [item.comments]);

  const handleSeenToggle = async () => {
    if (updating) return;
    try {
      setUpdating(true);
      await updateSeen(parentId, saveIndex, !item.seen);
      toast.success(`Marked as ${!item.seen ? 'seen' : 'unseen'}`);
      if (onUpdate) await onUpdate();
    } catch (error) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (updating) return;
    try {
      setUpdating(true);
      await updateFavorite(parentId, saveIndex, !item.favorite);
      toast.success(`${!item.favorite ? 'Added to' : 'Removed from'} favorites`);
      if (onUpdate) await onUpdate();
    } catch (error) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleLinkClick = async (e) => {
    e.preventDefault();
    window.open(item.url, '_blank');
    
    if (!item.seen && !updating) {
      try {
        setUpdating(true);
        await updateSeen(parentId, saveIndex, true);
        if (onUpdate) await onUpdate();
      } catch (error) {
        console.error('Failed to mark as seen:', error);
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleDelete = async () => {
    try {
      setUpdating(true);
      await deleteSave(parentId, saveIndex);
      toast.success('Item deleted');
      setShowDeleteModal(false);
      if (onUpdate) await onUpdate();
    } catch (error) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setUpdating(false);
    }
  };

  const handleMove = async (targetCollectionId) => {
    try {
      setUpdating(true);
      await moveItem(parentId, targetCollectionId, saveIndex);
      toast.success('Item moved');
      setShowMoveModal(false);
      if (onUpdate) await onUpdate();
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to move');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const formatLastSeen = (lastSeenAt) => {
    if (!lastSeenAt) return '';
    
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays < 7) return `${diffDays} day ago`;
    
    return date.toLocaleDateString();
  };

  const itemTitle = item.title || item.name || 'Untitled';
  const tags = item.tags || [];
  const siteName = getSiteNameFromUrl(item.url); // Get website name from URL

  return (
    <>
      <div className={`item-card ${item.seen ? 'seen' : ''} ${updating ? 'updating' : ''} ${selected ? 'selected' : ''}`}>
        {/* Facebook-style header with avatar */}
        <div className="item-header">
          <button 
            className={`select-checkbox ${selected ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleItem(itemKey, { save: item, parentId, parentTitle, saveIndex });
            }}
          >
            {selected ? <FiCheckSquare /> : <FiSquare />}
          </button>
          
          <div className="item-avatar">
            {favicon ? (
              <img src={favicon} alt="" style={{ width: 20, height: 20 }} />
            ) : (
              <FiExternalLink />
            )}
          </div>
          
          <div className="item-info">
            <h3 className="item-title">{itemTitle}</h3>
            <div className="item-meta">
              <span>
                <FiFolderPlus size={12} />
                {parentTitle || 'Collection'}
              </span>
              {item.author && (
                <span>
                  <FiUser size={12} />
                  {item.author.name || item.author}
                </span>
              )}
              {item.seen && item.lastSeenAt && (
                <span className="last-seen" title={`Last seen: ${new Date(item.lastSeenAt).toLocaleString()}`}>
                  <FiClock size={12} />
                  {lastSeenFormatted || formatLastSeen(item.lastSeenAt)}
                </span>
              )}
            </div>
          </div>

          <button className="more-btn" title="More options">
            <FiMoreHorizontal />
          </button>
        </div>

        {/* Content preview - Show on {website name} */}
        <div className="item-content">
          {item.url && (
            <a 
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="item-url"
            >
              <FiExternalLink className="url-icon" />
              <span className="url-text">Show on {siteName}</span>
            </a>
          )}
        </div>

        {/* Tags preview */}
        {tags.length > 0 && !showTags && (
          <div className="tags-container">
            {tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                <FiTag size={12} />
                {tag.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="tag">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Facebook-style action buttons */}
        <div className="item-actions">
          <button
            onClick={handleSeenToggle}
            className={`action-btn ${item.seen ? 'active' : ''}`}
            disabled={updating}
            title={item.seen ? 'Mark as unseen' : 'Mark as seen'}
          >
            {item.seen ? <FiEye /> : <FiEyeOff />}
            <span>{item.seen ? 'Seen' : 'Mark as Seen'}</span>
          </button>

          <button
            onClick={handleFavoriteToggle}
            className={`action-btn ${item.favorite ? 'liked' : ''}`}
            disabled={updating}
            title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <FiHeart />
            <span>{item.favorite ? 'Favourited' : 'Favourite'}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`action-btn ${showComments || commentCount > 0 ? 'commented' : ''}`}
            title="Comments"
          >
            <FiMessageSquare />
            <span>{commentCount > 0 ? `Comments (${commentCount})` : 'Comment'}</span>
          </button>

          <button
            onClick={() => setShowTags(!showTags)}
            className={`action-btn ${showTags || tags.length > 0 ? 'active' : ''}`}
            title="Tags"
          >
            <FiTag />
            <span>{tags.length > 0 ? `Tags (${tags.length})` : 'Add Tag'}</span>
          </button>

          <button
            onClick={() => setShowMoveModal(true)}
            className="action-btn"
            title="Move to collection"
            disabled={updating}
          >
            <FiFolderPlus />
            <span>Move</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="action-btn"
            title="Delete"
            disabled={updating}
          >
            <FiTrash2 />
            <span>Delete</span>
          </button>
        </div>

        {/* Expandable sections */}
        {showTags && (
          <div className="tags-section">
            <TagManager
              collectionId={parentId}
              saveIndex={saveIndex}
              tags={tags}
              onUpdate={onUpdate}
            />
          </div>
        )}

        {showComments && (
          <div className="comments-section">
            <CommentSection
              collectionId={parentId}
              saveIndex={saveIndex}
              onUpdate={onUpdate}
            />
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
      />

      <MoveToCollectionModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMove}
        currentCollectionId={parentId}
        currentCollectionTitle={parentTitle}
        itemTitle={itemTitle}
      />
    </>
  );
};

export default ItemCard;