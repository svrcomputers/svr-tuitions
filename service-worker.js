const CACHE_NAME = 'svr-tuitions-v1.1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - Handle network requests
self.addEventListener('fetch', event => {
  console.log('[Service Worker] Fetching:', event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // If not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Add to cache for future
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed; returning offline page', error);
            
            // For HTML requests, return the cached index.html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // For other requests, you could return a custom offline page
            return new Response('Network error. You are offline.', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  const title = 'SVR Tuitions';
  const options = {
    body: event.data ? event.data.text() : 'New notification from SVR Tuitions',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientList => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});
