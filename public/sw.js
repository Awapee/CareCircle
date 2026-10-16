/*
 * CareCircle service worker: lets the app open without a connection.
 * - Pages: network first, falling back to the last copy of the app shell.
 * - Built files (/assets/, hashed names) and icons: cache first, since a name never changes content.
 * - Anything else, including every request to the backend, goes straight to the network and is never cached.
 */
const CACHE = 'carecircle-v1';
const SHELL = new URL('./index.html', self.location).href;
const STATIC = new URL('./', self.location).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // GitHub Pages answers deep links with 404.html, which is the same app shell.
          if (response.headers.get('content-type')?.includes('text/html')) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  const path = url.pathname;
  if (path.startsWith(`${STATIC}assets/`) || path.startsWith(`${STATIC}icons/`)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
