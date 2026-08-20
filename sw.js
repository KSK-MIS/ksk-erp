// KSK ERP service worker
//
// v2 (2026-08-20). The v1 worker was cache-first for EVERYTHING, including
// index.html, and its cache name never changed. Result: returning users and
// installed PWAs were pinned to a pre-code-login index.html for weeks - they
// received a 6-digit sign-in code with nowhere to type it, because their
// cached page still had the old magic-link form.
//
// Rule from here on: HTML is NEVER served from cache while the network is
// reachable. Only static assets (icons, manifest) are cache-first.
// If you change the precache list, bump CACHE.

const CACHE = 'ksk-erp-v2';

// Static, rarely-changing assets only. Deliberately NO .html files here.
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first. Cache is an offline fallback only, never a source of
    // truth - this is what stops a bad page being pinned forever.
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
