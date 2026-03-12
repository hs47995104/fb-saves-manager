// backend/utils/urlCategorizer.js - Enhanced version

/**
 * Comprehensive URL categorization for all content types
 * Returns one of: 'video', 'reel', 'short', 'post', 'photo', 'link', 'unknown'
 */
function categorizeUrl(url) {
  if (!url || typeof url !== 'string') return 'unknown';

  const patterns = [
    // Video platforms
    { type: 'video', category: 'video', regex: /youtube\.com\/watch\?v=/i },
    { type: 'video', category: 'video', regex: /youtu\.be\//i },
    { type: 'video', category: 'video', regex: /youtube\.com\/shorts\//i },
    { type: 'video', category: 'video', regex: /vimeo\.com\//i },
    { type: 'video', category: 'video', regex: /dailymotion\.com\/video\//i },
    { type: 'video', category: 'video', regex: /twitch\.tv\/videos\//i },
    { type: 'video', category: 'video', regex: /tiktok\.com\/@.+\/video\//i },
    
    // Facebook videos
    { type: 'video', category: 'video', regex: /facebook\.com\/.*\/videos\//i },
    { type: 'video', category: 'video', regex: /fb\.watch\//i },
    { type: 'video', category: 'video', regex: /facebook\.com\/watch\?v=/i },
    { type: 'video', category: 'video', regex: /facebook\.com\/video\.php\?v=/i },
    
    // Reels/Shorts (short-form video)
    { type: 'reel', category: 'video', regex: /facebook\.com\/reel\//i },
    { type: 'reel', category: 'video', regex: /instagram\.com\/reel\//i },
    { type: 'reel', category: 'video', regex: /youtube\.com\/shorts\//i },
    { type: 'reel', category: 'video', regex: /tiktok\.com\//i },
    
    // Instagram
    { type: 'video', category: 'video', regex: /instagram\.com\/p\//i },
    { type: 'video', category: 'video', regex: /instagram\.com\/tv\//i },
    
    // Facebook posts
    { type: 'post', category: 'post', regex: /facebook\.com\/.*\/posts\//i },
    { type: 'post', category: 'post', regex: /facebook\.com\/story\.php\?story_fbid=/i },
    { type: 'post', category: 'post', regex: /facebook\.com\/permalink\.php\?story_fbid=/i },
    
    // Facebook groups
    { type: 'group_post', category: 'post', regex: /facebook\.com\/groups\/.*\/posts\//i },
    { type: 'group_post', category: 'post', regex: /facebook\.com\/groups\/.*\/permalink\//i },
    
    // Photos
    { type: 'photo', category: 'photo', regex: /facebook\.com\/photo\.php\?fbid=/i },
    { type: 'photo', category: 'photo', regex: /facebook\.com\/.*\/photos\//i },
    { type: 'photo', category: 'photo', regex: /instagram\.com\/p\//i },
    
    // Any external link
    { type: 'link', category: 'link', regex: /^https?:\/\//i }
  ];

  for (const { type, category, regex } of patterns) {
    if (regex.test(url)) {
      return { type, category };
    }
  }
  
  return { type: 'unknown', category: 'unknown' };
}

module.exports = { categorizeUrl };