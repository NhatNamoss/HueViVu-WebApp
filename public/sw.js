const CACHE_NAME = 'huevivu-static-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/assets/logo.png',
  '/offline.html',
  '/offline-trip-store.js',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('huevivu-static-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses: trip, weather, auth and place data must remain fresh.
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname === '/offline-trip-store.js' || url.pathname === '/offline.html') {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then(cached => cached || fetch(request)));
    return;
  }

  // Static assets use cache-first; navigations use network-first with a cached shell fallback.
  if (request.destination === 'image' || request.destination === 'font' || url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
  }
});
