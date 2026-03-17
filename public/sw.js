// LithoApp Service Worker — Cache-first for static assets, network-first for HTML
// IMPORTANT: Bump version whenever WASM or major assets change to purge stale cache
const CACHE_NAME = 'lithoapp-v3';

// Use the SW scope as base path — works on both '/' (dev) and '/LithoApp/' (GH Pages)
const BASE = self.registration ? self.registration.scope : '/';
const STATIC_ASSETS = [
  BASE,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for navigation (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(BASE))
    );
    return;
  }

  // Never cache WASM files — they change with Rust rebuilds and must always be fresh
  if (request.url.endsWith('.wasm')) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for static assets (JS, CSS, images)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && (
            request.url.endsWith('.js') ||
            request.url.endsWith('.css') ||
            request.url.endsWith('.png')
          )) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
