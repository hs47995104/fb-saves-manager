// frontend/src/utils/itemEnricher.js

import { isVideoUrl, getVideoPlatform } from './videoDetector';

/**
 * Pre-process items to add video information
 * This prevents each ItemCard from having to detect videos individually
 */
export const enrichItemsWithVideoInfo = (items) => {
  return items.map(item => {
    const save = item.save || item;
    const url = save.url || '';
    
    // Check if it's a video
    const isVideo = isVideoUrl(url);
    
    // Get video platform info if it's a video
    const videoPlatform = isVideo ? getVideoPlatform(url) : null;
    
    // Return enriched item
    return {
      ...item,
      _videoInfo: {
        isVideo,
        platform: videoPlatform,
        platformId: videoPlatform?.id || null,
        platformName: videoPlatform?.name || null,
        platformIcon: videoPlatform?.icon || null,
        platformColor: videoPlatform?.color || null,
        isReel: isVideo && (url.includes('reel') || url.includes('shorts'))
      }
    };
  });
};

/**
 * Enrich a single item
 */
export const enrichItem = (item, parentId, parentTitle, saveIndex) => {
  const save = item.save || item;
  const url = save.url || '';
  
  const isVideo = isVideoUrl(url);
  const videoPlatform = isVideo ? getVideoPlatform(url) : null;
  
  return {
    save: item.save || item,
    parentId,
    parentTitle,
    saveIndex,
    _videoInfo: {
      isVideo,
      platform: videoPlatform,
      platformId: videoPlatform?.id || null,
      platformName: videoPlatform?.name || null,
      platformIcon: videoPlatform?.icon || null,
      platformColor: videoPlatform?.color || null,
      isReel: isVideo && (url.includes('reel') || url.includes('shorts'))
    }
  };
};