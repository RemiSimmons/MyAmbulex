const CACHE_NAME = 'myambulex-v1.0.0';
const STATIC_CACHE = 'myambulex-static-v1.0.0';
const API_CACHE = 'myambulex-api-v1.0.0';

// Essential files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  // Core PWA files - other assets are cached dynamically
];

// API endpoints to cache for offline access
const CACHEABLE_API_ROUTES = [
  '/api/user',
  '/api/rides',
  '/api/notifications',
  '/api/driver/dashboard',
  '/api/driver/available-rides'
];

// Network-first strategy for API calls
const NETWORK_FIRST_ROUTES = [
  '/api/rides',
  '/api/driver/available-rides',
  '/api/notifications'
];

// Cache-first strategy for static assets
const CACHE_FIRST_ROUTES = [
  '/pwa-icons/',
  '/assets/',
  '.css',
  '.js',
  '.woff',
  '.woff2'
];

self.addEventListener('install', (event) => {
  console.log('PWA Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('PWA Service Worker: Caching static assets');
        // Cache essential files individually with error handling
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`PWA Service Worker: Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('PWA Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('PWA Service Worker: Installation failed', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('PWA Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
              console.log('PWA Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('PWA Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    handleFetchRequest(request, url)
  );
});

async function handleFetchRequest(request, url) {
  // API requests - Network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request, url);
  }
  
  // Static assets - Cache first with network fallback
  if (isCacheFirstResource(url.pathname)) {
    return handleCacheFirst(request);
  }
  
  // Navigation requests - Network first with offline fallback
  if (request.mode === 'navigate') {
    return handleNavigationRequest(request);
  }
  
  // Default strategy - Network first
  return handleNetworkFirst(request);
}

async function handleApiRequest(request, url) {
  const cache = await caches.open(API_CACHE);
  
  // For real-time data, always try network first
  if (NETWORK_FIRST_ROUTES.some(route => url.pathname.includes(route))) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Cache successful responses
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      console.log('PWA Service Worker: Network failed for API, trying cache', url.pathname);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
  
  // For other API calls, try cache first then network
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Ignore network errors for background updates
    });
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'You are currently offline. Some features may be limited.' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleCacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('PWA Service Worker: Failed to fetch static asset', request.url);
    throw error;
  }
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('PWA Service Worker: Navigation failed, serving offline page');
    const cache = await caches.open(STATIC_CACHE);
    const offlinePage = await cache.match('/offline.html');
    return offlinePage || new Response('Offline', { status: 503 });
  }
}

async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

function isCacheFirstResource(pathname) {
  return CACHE_FIRST_ROUTES.some(route => pathname.includes(route));
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('PWA Service Worker: Push notification received');
  
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/pwa-icons/icon-192x192.png',
      badge: '/pwa-icons/icon-72x72.png',
      tag: data.tag || 'myambulex-notification',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/pwa-icons/icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MyAmbulex', options)
    );
  } catch (error) {
    console.error('PWA Service Worker: Push notification error', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('PWA Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('PWA Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  try {
    // Here you would implement logic to sync offline actions
    // such as ride bookings, bid submissions, etc.
    console.log('PWA Service Worker: Syncing offline actions...');
    
    // Get offline actions from IndexedDB or other storage
    // Process each action and send to server
    // Remove successful actions from storage
    
    console.log('PWA Service Worker: Offline sync completed');
  } catch (error) {
    console.error('PWA Service Worker: Offline sync failed', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    // Force cache update for specific resources
    event.waitUntil(updateCacheForUrl(event.data.url));
  }
});

async function updateCacheForUrl(url) {
  try {
    const cache = await caches.open(API_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log('PWA Service Worker: Cache updated for', url);
    }
  } catch (error) {
    console.error('PWA Service Worker: Cache update failed for', url, error);
  }
}