// Tiny Proxy-based reactive store. Subscribe to keys, get notified on change.

/**
 * @template T
 * @param {T} initial
 */
export function createStore(initial) {
  const subs = new Map(); // key → Set<callback>
  const allSubs = new Set();

  const notify = (key) => {
    const set = subs.get(key);
    if (set) for (const cb of set) cb(state[key], key);
    for (const cb of allSubs) cb(state[key], key);
  };

  const state = new Proxy({ ...initial }, {
    set(target, key, value) {
      if (target[key] !== value) {
        target[key] = value;
        notify(key);
      }
      return true;
    },
  });

  return {
    state,
    subscribe(key, cb) {
      if (typeof key === 'function') { allSubs.add(key); return () => allSubs.delete(key); }
      if (!subs.has(key)) subs.set(key, new Set());
      subs.get(key).add(cb);
      return () => subs.get(key).delete(cb);
    },
    update(patch) { for (const k of Object.keys(patch)) state[k] = patch[k]; },
  };
}
