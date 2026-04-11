/**
 * WebLM Service Worker
 * 
 * Enables offline capability and injects COOP/COEP headers for SharedArrayBuffer support.
 * This is critical for WebLLM to work on static hosting (GitHub Pages, etc.).
 */

const CACHE_NAME = 'weblm-v1';
const CACHE_URLS = ['/', '/index.html'];

/**
 * Install event - cache the main page
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(CACHE_URLS.map(url => 
        new Request(url, { cache: 'reload' })
      ));
    })
  );
  // Activate immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

/**
 * Fetch event - serve from cache, fallback to network
 * Also injects COOP/COEP headers for SharedArrayBuffer support
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For HTML requests, try cache first, then network
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return addCoopCoepHeaders(cachedResponse);
        }

        return fetch(request)
          .then((networkResponse) => {
            // Cache the new response
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            return addCoopCoepHeaders(networkResponse);
          })
          .catch(() => {
            // Network failed, try to return cached page
            return caches.match('/').then((fallbackResponse) => {
              if (fallbackResponse) {
                return addCoopCoepHeaders(fallbackResponse);
              }
              return new Response('Offline - page not cached', {
                status: 503,
                statusText: 'Service Unavailable',
              });
            });
          });
      })
    );
    return;
  }

  // For non-HTML requests (JS, CSS, etc.), use network first, cache as fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Clone and cache
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});

/**
 * Add COOP/COEP headers to a response.
 * This is required for SharedArrayBuffer to work.
 */
function addCoopCoepHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
  newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Message handler for cache updates
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});