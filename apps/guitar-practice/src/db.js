// IndexedDB wrapper for songs + settings, with localStorage fallback for older Safari.

const DB_NAME = 'guitar-practice';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_SETTINGS = 'settings';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-indexeddb'));

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode = 'readonly') {
  return openDB().then(db => db.transaction(store, mode).objectStore(store));
}

function lsKey(store, id) { return `gp:${store}:${id}`; }

// --- Songs ---

/**
 * @typedef {{id: string, title: string, artist: string, source: string, favorite: boolean, updated: number}} SongRecord
 */

export async function saveSong(song) {
  song.updated = Date.now();
  try {
    const store = await tx(STORE_SONGS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(song);
      req.onsuccess = () => resolve(song);
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.setItem(lsKey(STORE_SONGS, song.id), JSON.stringify(song));
    return song;
  }
}

export async function getSong(id) {
  try {
    const store = await tx(STORE_SONGS);
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(lsKey(STORE_SONGS, id));
    return raw ? JSON.parse(raw) : null;
  }
}

export async function getAllSongs() {
  try {
    const store = await tx(STORE_SONGS);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`gp:${STORE_SONGS}:`)) out.push(JSON.parse(localStorage.getItem(k)));
    }
    return out;
  }
}

export async function deleteSong(id) {
  try {
    const store = await tx(STORE_SONGS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.removeItem(lsKey(STORE_SONGS, id));
  }
}

// --- Settings ---

export async function getSetting(key, defaultValue = null) {
  try {
    const store = await tx(STORE_SETTINGS);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(lsKey(STORE_SETTINGS, key));
    return raw ? JSON.parse(raw).value : defaultValue;
  }
}

export async function setSetting(key, value) {
  try {
    const store = await tx(STORE_SETTINGS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.setItem(lsKey(STORE_SETTINGS, key), JSON.stringify({ value }));
  }
}

// --- Seeding ---

export async function seedIfEmpty(seedSongs) {
  const existing = await getAllSongs();
  if (existing.length > 0) return false;
  for (const s of seedSongs) await saveSong(s);
  return true;
}
