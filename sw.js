// Cache-first service worker for app shell. Offline-first since everything's local.

const CACHE = 'guitar-practice-v1';
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
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
