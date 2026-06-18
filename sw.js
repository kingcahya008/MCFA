/* ═══════════════════════════════════════════════════
   M.C.F.A PROJECT — Service Worker v3
   Offline-first · Cache-first · Premium PWA
═══════════════════════════════════════════════════ */

const CACHE_NAME = 'mcfa-v3';
const STATIC_ASSETS = [
  './',
  './FA_PROJECT.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ── Install: cache semua static assets ── */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Kalau ada yang gagal, tetap lanjut
        return Promise.resolve();
      });
    })
  );
});

/* ── Activate: hapus cache lama ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first dengan network fallback ── */
self.addEventListener('fetch', event => {
  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension dan non-http
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Font Google — network-first dengan cache backup
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(event.request)
          .then(res => {
            if (res.ok) cache.put(event.request, res.clone());
            return res;
          })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // Aset lokal — cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || !res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() => {
        // Offline fallback — tampilkan FA_PROJECT.html
        if (event.request.destination === 'document') {
          return caches.match('./FA_PROJECT.html');
        }
      });
    })
  );
});

/* ── Background sync — update cache saat online ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache =>
        cache.addAll(event.data.urls || [])
      )
    );
  }
});
