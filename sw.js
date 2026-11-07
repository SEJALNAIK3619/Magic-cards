const CACHE_NAME = 'magic-matrix-v3'; // Incremented version to clear old cache
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Force immediate activation when a new worker is installed
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // We catch errors individually so one missing asset doesn't break the entire installation
        return Promise.all(
          ASSETS.map(url => {
            return cache.add(url).catch(err => console.warn(`Failed to cache asset: ${url}`, err));
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Clean up old versions of the cache to keep the app performing correctly
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Safe network-first / cache-fallback matching logic
self.addEventListener('fetch', (e) => {
  // Only handle standard http/https requests (prevents browser extension errors)
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version but fetch update in background (Stale-While-Revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => /* Ignore network failures offline */ {});
        return cachedResponse;
      }
      
      // Fallback to direct network request if not explicitly cached
      return fetch(e.request);
    })
  );
});
