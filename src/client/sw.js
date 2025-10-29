/**
 * Service Worker for F1 Start Challenge
 * 
 * Provides caching and offline support for the game
 */

const CACHE_NAME = 'f1-start-challenge-v1';
const STATIC_CACHE_NAME = 'f1-static-v1';
const DYNAMIC_CACHE_NAME = 'f1-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/index.css',
  // Add other critical assets
];

// Assets to cache on first request
const DYNAMIC_ASSETS = [
  '/api/leaderboard',
  '/api/user-session',
  // Add other API endpoints
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleOtherRequest(request));
  }
});

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|html|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/);
}

/**
 * Check if request is for an API endpoint
 */
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Handle static asset requests - cache first strategy
 */
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to handle static asset', error);
    
    // Return offline fallback if available
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    return new Response('Asset not available offline', { status: 503 });
  }
}

/**
 * Handle API requests - network first strategy with cache fallback
 */
async function handleAPIRequest(request) {
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API request');
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (request.url.includes('/api/user-session')) {
      return new Response(JSON.stringify({
        offline: true,
        message: 'Playing in offline mode'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Service unavailable offline',
      offline: true
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}

/**
 * Handle other requests - network first with cache fallback
 */
async function handleOtherRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Not available offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-scores') {
    event.waitUntil(syncOfflineScores());
  }
});

/**
 * Sync offline scores when connection is restored
 */
async function syncOfflineScores() {
  try {
    // Get offline scores from IndexedDB or cache
    const offlineScores = await getOfflineScores();
    
    for (const score of offlineScores) {
      try {
        await fetch('/api/game/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(score)
        });
        
        // Remove synced score from offline storage
        await removeOfflineScore(score.id);
      } catch (error) {
        console.error('Failed to sync score:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

/**
 * Get offline scores (placeholder - implement with IndexedDB)
 */
async function getOfflineScores() {
  // TODO: Implement IndexedDB storage for offline scores
  return [];
}

/**
 * Remove synced offline score (placeholder)
 */
async function removeOfflineScore(scoreId) {
  // TODO: Implement IndexedDB removal
}

// Push notifications for challenges (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new F1 challenge!',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'f1-challenge',
      data: data.url || '/',
      actions: [
        {
          action: 'accept',
          title: 'Accept Challenge'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'F1 Start Challenge', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'accept') {
    // Open the challenge URL
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});