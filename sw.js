// Cache-first service worker for app shell. Offline-first since everything's local.

const CACHE = 'guitar-practice-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles/base.css',
  './styles/components.css',
  './src/app.js',
  './src/store.js',
  './src/db.js',
  './src/chordpro.js',
  './src/chords.js',
  './src/transpose.js',
  './src/scroll.js',
  './src/songs-seed.js',
  './src/audio/metronome.js',
  './src/audio/tuner.js',
  './src/audio/reference.js',
  './src/ui/song-list.js',
  './src/ui/song-player.js',
  './src/ui/song-edit.js',
  './src/ui/tuner-view.js',
  './src/ui/metronome-view.js',
  './src/ui/settings.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL).catch(err => console.warn('partial cache', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Network-first for same-origin HTML/JS/CSS so code updates propagate.
  // Cache-first for everything else (icons, fonts, third-party).
  const isAppCode = url.origin === self.location.origin &&
    /\.(html|js|mjs|css|json)$/.test(url.pathname);
  if (isAppCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
