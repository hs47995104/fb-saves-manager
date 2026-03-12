// frontend/src/utils/videoDetector.js - Enhanced version

/**
 * Video platform patterns and their display names
 */
const VIDEO_PLATFORMS = {
  youtube: {
    patterns: [
      /youtube\.com\/watch\?v=/i,
      /youtu\.be\//i,
      /youtube\.com\/shorts\//i,
      /youtube\.com\/embed\//i,
      /m\.youtube\.com\/watch\?v=/i
    ],
    name: 'YouTube',
    icon: '🎬',
    color: '#FF0000'
  },
  instagram: {
    patterns: [
      /instagram\.com\/reel\//i,
      /instagram\.com\/p\//i,
      /instagr\.am\/reel\//i,
      /instagram\.com\/tv\//i
    ],
    name: 'Instagram',
    icon: '📷',
    color: '#E1306C'
  },
  tiktok: {
    patterns: [
      /tiktok\.com\//i,
      /vm\.tiktok\.com\//i,
      /tiktok\.com\/@.+\/video\//i
    ],
    name: 'TikTok',
    icon: '🎵',
    color: '#000000'
  },
  facebook: {
    patterns: [
      /facebook\.com\/watch\?v=/i,
      /fb\.watch\//i,
      /facebook\.com\/reel\//i,
      /facebook\.com\/video\.php\?v=/i,
      /fb\.com\/watch\//i,
      /facebook\.com\/.*\/videos\//i,
      /fb\.com\/.*\/videos\//i,
      /web\.facebook\.com\/.*\/videos\//i
    ],
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2'
  },
  twitter: {
    patterns: [
      /twitter\.com\/i\/status\//i,
      /x\.com\/i\/status\//i,
      /twitter\.com\/.*\/status\//i,
      /x\.com\/.*\/status\//i
    ],
    name: 'Twitter/X',
    icon: '🐦',
    color: '#1DA1F2'
  },
  vimeo: {
    patterns: [
      /vimeo\.com\//i,
      /vimeo\.com\/video\//i,
      /player\.vimeo\.com\/video\//i
    ],
    name: 'Vimeo',
    icon: '🎥',
    color: '#1AB7EA'
  },
  dailymotion: {
    patterns: [
      /dailymotion\.com\/video\//i,
      /dai\.ly\//i,
      /dailymotion\.com\/embed\/video\//i
    ],
    name: 'Dailymotion',
    icon: '🎞️',
    color: '#0066DC'
  },
  twitch: {
    patterns: [
      /twitch\.tv\/videos\//i,
      /twitch\.tv\/.*\/clip\//i,
      /clips\.twitch\.tv\//i
    ],
    name: 'Twitch',
    icon: '🎮',
    color: '#9146FF'
  },
  reddit: {
    patterns: [
      /reddit\.com\/r\/.*\/s\//i,
      /reddit\.com\/r\/.*\/comments\//i,
      /redd\.it\//i,
      /v\.redd\.it\//i
    ],
    name: 'Reddit',
    icon: '🤖',
    color: '#FF4500'
  }
};

/**
 * Common video file extensions
 */
const VIDEO_EXTENSIONS = [
  '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', 
  '.flv', '.wmv', '.m4v', '.3gp', '.mpeg', '.mpg'
];

/**
 * Check if a URL contains video content
 */
export const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check for video platforms
  for (const [platform, data] of Object.entries(VIDEO_PLATFORMS)) {
    if (data.patterns.some(pattern => pattern.test(url))) {
      return true;
    }
  }
  
  // Check for video file extensions
  const lowerUrl = url.toLowerCase();
  if (VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext))) {
    return true;
  }
  
  // Check for common video patterns in URLs
  const videoPatterns = [
    /\/video\//i,
    /\/watch\?/i,
    /\/shorts\//i,
    /\/reel\//i,
    /\/live\//i,
    /\/clip\//i,
    /stream/i,
    /vod\//i
  ];
  
  return videoPatterns.some(pattern => pattern.test(lowerUrl));
};

/**
 * Get video platform info from URL
 */
export const getVideoPlatform = (url) => {
  if (!url) return null;
  
  for (const [platform, data] of Object.entries(VIDEO_PLATFORMS)) {
    if (data.patterns.some(pattern => pattern.test(url))) {
      return {
        id: platform,
        name: data.name,
        icon: data.icon,
        color: data.color
      };
    }
  }
  
  // Check if it's a direct video file
  const lowerUrl = url.toLowerCase();
  if (VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext))) {
    return {
      id: 'direct',
      name: 'Video',
      icon: '📹',
      color: '#666666'
    };
  }
  
  return null;
};

/**
 * Get video category (for filtering)
 */
export const getVideoCategory = (url) => {
  if (!url) return 'unknown';
  
  // Reels/Shorts
  if (url.match(/reel|shorts/i)) return 'reel';
  
  // Regular videos
  if (isVideoUrl(url)) return 'video';
  
  return 'unknown';
};

/**
 * Extract video ID from platform URLs
 */
export const extractVideoId = (url, platform) => {
  if (!url) return null;
  
  try {
    switch (platform) {
      case 'youtube':
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?#/]+)/i);
        return youtubeMatch ? youtubeMatch[1] : null;
        
      case 'instagram':
        const instagramMatch = url.match(/\/(?:p|reel|tv)\/([^/?]+)/i);
        return instagramMatch ? instagramMatch[1] : null;
        
      case 'tiktok':
        const tiktokMatch = url.match(/\/video\/(\d+)/i);
        return tiktokMatch ? tiktokMatch[1] : null;
        
      case 'vimeo':
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
        return vimeoMatch ? vimeoMatch[1] : null;
        
      default:
        return null;
    }
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
};

/**
 * Filter items to only include video content
 */
export const filterVideoItems = (items) => {
  return items.filter(item => {
    const save = item.save || item;
    return isVideoUrl(save.url);
  });
};

/**
 * Group video items by platform
 */
export const groupVideosByPlatform = (items) => {
  const groups = {};
  
  items.forEach(item => {
    const save = item.save || item;
    const platform = getVideoPlatform(save.url);
    const platformId = platform?.id || 'other';
    
    if (!groups[platformId]) {
      groups[platformId] = {
        platform: platform || { id: 'other', name: 'Other Videos', icon: '📺', color: '#666666' },
        items: []
      };
    }
    
    groups[platformId].items.push(item);
  });
  
  return groups;
};

/**
 * Group video items by category (video, reel, short)
 */
export const groupVideosByCategory = (items) => {
  const groups = {
    all: { name: 'All Videos', icon: '🎬', items: [] },
    reels: { name: 'Reels & Shorts', icon: '📱', items: [] },
    videos: { name: 'Regular Videos', icon: '📺', items: [] }
  };
  
  items.forEach(item => {
    const save = item.save || item;
    const url = save.url || '';
    
    groups.all.items.push(item);
    
    if (url.match(/reel|shorts/i)) {
      groups.reels.items.push(item);
    } else {
      groups.videos.items.push(item);
    }
  });
  
  return groups;
};

/**
 * Get video statistics
 */
export const getVideoStats = (items) => {
  const videoItems = filterVideoItems(items);
  const platforms = {};
  let reels = 0;
  let videos = 0;
  
  videoItems.forEach(item => {
    const save = item.save || item;
    const platform = getVideoPlatform(save.url);
    const platformName = platform?.name || 'Other';
    
    platforms[platformName] = (platforms[platformName] || 0) + 1;
    
    if (save.url.match(/reel|shorts/i)) {
      reels++;
    } else {
      videos++;
    }
  });
  
  return {
    total: videoItems.length,
    reels,
    videos,
    platforms
  };
};

/**
 * Get video badge style
 */
export const getVideoBadgeStyle = (platform) => {
  if (!platform) return {};
  
  return {
    backgroundColor: platform.color + '20',
    color: platform.color,
    borderColor: platform.color
  };
};

export default {
  isVideoUrl,
  getVideoPlatform,
  getVideoCategory,
  extractVideoId,
  filterVideoItems,
  groupVideosByPlatform,
  groupVideosByCategory,
  getVideoStats,
  getVideoBadgeStyle,
  VIDEO_PLATFORMS
};