/**
 * Generic IndexedDB-backed offline queue.
 */

const DB_NAME = "me-and-coach-offline";
const DB_VERSION = 1;
const STORE = "attendance_queue";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function enqueue(item) {
  await withStore("readwrite", (store) => store.put(item));
}

export async function getAllQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedForBatch(batchId) {
  const all = await getAllQueued();
  return all.filter((item) => item.batch_id === batchId);
}

export async function removeFromQueue(ids) {
  if (ids.length === 0) return;
  await withStore("readwrite", (store) => {
    ids.forEach((id) => store.delete(id));
  });
}
