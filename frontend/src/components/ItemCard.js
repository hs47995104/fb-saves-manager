import React, { useState, useEffect } from 'react';
import { 
  FiEye, FiEyeOff, FiExternalLink, FiTrash2, FiFolderPlus, 
  FiHeart, FiTag, FiMessageSquare, FiMessageCircle, FiCheckSquare, 
  FiSquare, FiCopy, FiInfo
} from 'react-icons/fi';
import { updateSeen, updateFavorite, deleteSave, moveItem } from '../api';
import { toast } from 'react-toastify';
import { useSelection } from '../contexts/SelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatDuplicateLocations } from '../utils/duplicateDetector';
import DeleteModal from './DeleteModal';
import MoveToCollectionModal from './MoveToCollectionModal';
import TagManager from './TagManager';
import CommentSection from './CommentSection';
import './Styles.css';

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

const getDuplicateInfo = (collectionId, saveIndex) => {
  const key = `${collectionId}-${saveIndex}`;
  return window.__duplicateMap?.get(key);
};

const ItemCard = ({ item, parentId, parentTitle, saveIndex, onUpdate }) => {
  const { toggleItem, isSelected } = useSelection();
  const { settings } = useSettings();
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comments?.length || 0);
  const [hasComments, setHasComments] = useState(item.comments?.length > 0 || false);

  const duplicateInfo = getDuplicateInfo(parentId, saveIndex);
  const itemKey = `${parentId}-${saveIndex}`;
  const selected = isSelected(itemKey);

  useEffect(() => {
    const count = item.comments?.length || 0;
    setCommentCount(count);
    setHasComments(count > 0);
  }, [item.comments]);

  const handleSeenToggle = async () => {
    if (updating) return;
    
    try {
      setUpdating(true);
      console.log('Toggling seen:', { parentId, saveIndex, currentSeen: item.seen, newSeen: !item.seen });
      
      await updateSeen(parentId, saveIndex, !item.seen);
      toast.success(`Marked as ${!item.seen ? 'seen' : 'unseen'}`);
      
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Failed to update seen status:', error);
      toast.error(error.message || 'Failed to update seen status');
    } finally {
      setUpdating(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (updating) return;
    
    try {
      setUpdating(true);
      console.log('Toggling favorite:', { parentId, saveIndex, currentFavorite: item.favorite, newFavorite: !item.favorite });
      
      await updateFavorite(parentId, saveIndex, !item.favorite);
      toast.success(`${!item.favorite ? 'Added to' : 'Removed from'} favorites`);
      
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Failed to update favorite status:', error);
      toast.error(error.message || 'Failed to update favorite status');
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
        toast.success('Marked as seen');
        
        if (onUpdate) {
          await onUpdate();
        }
      } catch (error) {
        console.error('Failed to mark as seen:', error);
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!parentId || saveIndex === undefined) {
      toast.error('Cannot delete: Missing item information');
      return;
    }

    try {
      setUpdating(true);
      console.log('Deleting save:', { parentId, saveIndex });
      
      await deleteSave(parentId, saveIndex);
      toast.success('Item deleted successfully');
      setShowDeleteModal(false);
      
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error(error.message || 'Failed to delete item');
    } finally {
      setUpdating(false);
    }
  };

  const handleMove = async (targetCollectionId) => {
    if (!parentId || saveIndex === undefined) {
      toast.error('Cannot move: Missing item information');
      return false;
    }

    try {
      setUpdating(true);
      console.log('Moving item:', { sourceId: parentId, targetId: targetCollectionId, saveIndex });
      
      await moveItem(parentId, targetCollectionId, saveIndex);
      toast.success('Item moved successfully');
      setShowMoveModal(false);
      
      if (onUpdate) {
        await onUpdate();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to move item:', error);
      toast.error(error.message || 'Failed to move item');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleCommentToggle = () => {
    setShowComments(!showComments);
  };

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
    setHasComments(true);
  };

  const handleCommentDeleted = () => {
    const newCount = commentCount - 1;
    setCommentCount(newCount);
    setHasComments(newCount > 0);
  };

  const handleSelectToggle = (e) => {
    e.stopPropagation();
    toggleItem(itemKey, {
      save: item,
      parentId,
      parentTitle,
      saveIndex,
      parentFbid: parentId
    });
  };

  const getDuplicateLocationsText = () => {
    if (!duplicateInfo?.duplicateLocations) return '';
    
    const otherLocations = duplicateInfo.duplicateLocations.filter(
      loc => loc.collectionId !== parentId || loc.saveIndex !== saveIndex
    );
    
    if (otherLocations.length === 0) return '';
    
    const collectionMap = new Map();
    otherLocations.forEach(loc => {
      const key = loc.collectionId;
      if (!collectionMap.has(key)) {
        collectionMap.set(key, {
          title: loc.collectionTitle,
          count: 1
        });
      } else {
        const existing = collectionMap.get(key);
        existing.count++;
      }
    });
    
    const parts = [];
    let count = 0;
    
    for (const [_, { title, count: itemCount }] of collectionMap) {
      if (count >= 3) break;
      if (itemCount === 1) {
        parts.push(`"${title}"`);
      } else {
        parts.push(`"${title}" (${itemCount})`);
      }
      count++;
    }
    
    const remaining = otherLocations.length - parts.length;
    
    if (remaining > 0) {
      if (parts.length === 0) {
        return `in ${remaining} other location${remaining > 1 ? 's' : ''}`;
      }
      return `${parts.join(', ')} and ${remaining} more`;
    }
    
    return parts.join(', ');
  };

  const itemName = typeof item.name === 'object' ? item.name?.name || '' : item.name || '';
  const itemTitle = typeof item.title === 'object' ? item.title?.title || '' : item.title || '';
  const groupName = item.group && typeof item.group === 'object' ? item.group.name : item.group;
  const authorName = item.author && typeof item.author === 'object' ? item.author.name : item.author;
  const tags = item.tags || [];
  
  const siteName = getSiteNameFromUrl(item.url);

  return (
    <>
      <div className={`item-card ${item.seen ? 'seen' : ''} ${updating ? 'updating' : ''} ${selected ? 'selected' : ''}`}>
        <div className="item-content">
          <div className="item-header">
            <div className="title-row">
              <button 
                className={`select-checkbox ${selected ? 'selected' : ''}`}
                onClick={handleSelectToggle}
                title={selected ? 'Deselect' : 'Select'}
              >
                {selected ? <FiCheckSquare /> : <FiSquare />}
              </button>
              <h3 className="item-title">
                {itemTitle || itemName || 'Untitled'}
              </h3>
            </div>
            {itemName && itemName !== itemTitle && (
              <span className="item-author">by {itemName}</span>
            )}
          </div>

          {groupName && (
            <div className="item-group">
              Group: {groupName}
            </div>
          )}

          {authorName && (
            <div className="item-author-info">
              Author: {authorName}
            </div>
          )}

          <div className="item-url" title={item.url}>
            <FiExternalLink className="url-icon" />
            <a 
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
            >
              Show on {siteName}
            </a>
          </div>

          {tags.length > 0 && !showTags && (
            <div className="tags-preview">
              {tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index} 
                  className="tag-pill"
                  style={{ backgroundColor: tag.color || '#3498db' }}
                >
                  {tag.name}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="more-tags">+{tags.length - 3} more</span>
              )}
            </div>
          )}

          {settings.showDuplicates && duplicateInfo && (
            <>
              {duplicateInfo.isDuplicate && (
                <div 
                  className="duplicate-badge"
                  onClick={() => setShowDuplicateDetails(!showDuplicateDetails)}
                >
                  <FiCopy className="duplicate-icon" />
                  <div className="duplicate-content">
                    <span className="duplicate-text">
                      Duplicate of item in "{duplicateInfo.originalCollectionTitle}"
                    </span>
                    {duplicateInfo.duplicateLocations && duplicateInfo.duplicateLocations.length > 0 && (
                      <span className="duplicate-locations">
                        Also in: {getDuplicateLocationsText()}
                      </span>
                    )}
                  </div>
                  <FiInfo className="info-icon" />
                </div>
              )}

              {duplicateInfo.isOriginal && duplicateInfo.duplicateCount > 0 && (
                <div 
                  className="original-badge"
                  onClick={() => setShowDuplicateDetails(!showDuplicateDetails)}
                >
                  <FiCopy className="original-icon" />
                  <div className="duplicate-content">
                    <span className="original-text">
                      Original • {duplicateInfo.duplicateCount} duplicate{duplicateInfo.duplicateCount !== 1 ? 's' : ''}
                    </span>
                    {duplicateInfo.duplicateLocations && duplicateInfo.duplicateLocations.length > 0 && (
                      <span className="duplicate-locations">
                        Located in: {getDuplicateLocationsText()}
                      </span>
                    )}
                  </div>
                  <FiInfo className="info-icon" />
                </div>
              )}

              {showDuplicateDetails && duplicateInfo.duplicateLocations && (
                <div className="duplicate-details">
                  <h4>All Locations:</h4>
                  <ul className="location-list">
                    {duplicateInfo.isOriginal && (
                      <li className="current-location">
                        <strong>📍 This collection:</strong> "{parentTitle}"
                      </li>
                    )}
                    {duplicateInfo.duplicateLocations
                      .filter(loc => loc.collectionId !== parentId || loc.saveIndex !== saveIndex)
                      .map((loc, idx) => (
                        <li key={idx} className="other-location">
                          <FiCopy /> "{loc.collectionTitle}"
                          {loc.collectionId === duplicateInfo.originalCollectionId && 
                            loc.saveIndex === duplicateInfo.originalIndex && 
                            ' (Original)'}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="quick-stats">
            {hasComments && (
              <div className="stat-badge comment-stat" title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}`}>
                <FiMessageCircle />
                <span>{commentCount}</span>
              </div>
            )}
            {tags.length > 0 && (
              <div className="stat-badge tag-stat" title={`${tags.length} tag${tags.length !== 1 ? 's' : ''}`}>
                <FiTag />
                <span>{tags.length}</span>
              </div>
            )}
            {duplicateInfo?.isDuplicate && settings.showDuplicates && (
              <div className="stat-badge duplicate-stat" title="Duplicate item">
                <FiCopy />
                <span>Duplicate</span>
              </div>
            )}
          </div>

          <div className="action-row">
            <button
              onClick={() => setShowTags(!showTags)}
              className={`action-btn tag-btn ${showTags ? 'active' : ''} ${tags.length > 0 ? 'has-items' : ''}`}
              title="Manage tags"
              disabled={updating}
            >
              <FiTag />
              {tags.length > 0 && <span className="badge">{tags.length}</span>}
            </button>
            
            <button
              onClick={handleCommentToggle}
              className={`action-btn comment-btn ${showComments ? 'active' : ''} ${hasComments ? 'has-items' : ''}`}
              title={hasComments ? `View ${commentCount} comments` : 'Add comment'}
              disabled={updating}
            >
              <FiMessageSquare />
              {hasComments && <span className="badge">{commentCount}</span>}
            </button>
            
            <button
              onClick={handleFavoriteToggle}
              className={`action-btn favorite-btn ${item.favorite ? 'active' : ''}`}
              title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
              disabled={updating}
            >
              <FiHeart />
            </button>
            
            <button
              onClick={handleSeenToggle}
              className={`action-btn seen-btn ${item.seen ? 'active' : ''}`}
              title={item.seen ? 'Mark as unseen' : 'Mark as seen'}
              disabled={updating}
            >
              {item.seen ? <FiEye /> : <FiEyeOff />}
            </button>
            
            <button
              onClick={() => setShowMoveModal(true)}
              className="action-btn move-btn"
              title="Move to another collection"
              disabled={updating}
            >
              <FiFolderPlus />
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="action-btn delete-btn"
              title="Delete item"
              disabled={updating}
            >
              <FiTrash2 />
            </button>
          </div>

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
                onCommentAdded={handleCommentAdded}
                onCommentDeleted={handleCommentDeleted}
              />
            </div>
          )}

          <div className="item-footer">
            <div className="item-parent">
              From: {parentTitle || 'Untitled Collection'}
            </div>
          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Saved Item"
        message="Are you sure you want to delete this saved item? This action cannot be undone."
      />

      <MoveToCollectionModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMove}
        currentCollectionId={parentId}
        currentCollectionTitle={parentTitle}
        itemTitle={itemTitle || itemName || 'Untitled'}
      />
    </>
  );
};

export default ItemCard;