// Demos parsed in the visitor's browser are kept in IndexedDB (they never leave the device).
const DB = 'cs2dr', STORE = 'demos';

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'slug' });
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const run = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), out = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(out && 'result' in out ? out.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
};

export const isLocal = slug => String(slug).startsWith('local_');
export const putDemo = rec => run('readwrite', s => s.put(rec));
export const getDemo = slug => run('readonly', s => s.get(slug));
export const deleteDemo = slug => run('readwrite', s => s.delete(slug));
export const listLocal = async () => {
  try { return ((await run('readonly', s => s.getAll())) || []).map(r => r.summary); }
  catch { return []; }
};
