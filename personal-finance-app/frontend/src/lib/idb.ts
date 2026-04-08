/**
 * IndexedDB storage layer — mirrors the api.ts interface.
 * Used automatically when no Apps Script URL is configured.
 * Stores: transactions, investments, insurance, subscriptions, vault
 */

const DB_NAME    = 'myfinance_local';
const DB_VERSION = 1;
const STORES     = ['transactions', 'investments', 'insurance', 'subscriptions', 'vault'] as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function idbGetRows(store: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}

export async function idbAddRow(store: string, data: Record<string, any>): Promise<void> {
  if (!data.id) data = { ...data, id: crypto.randomUUID() };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function idbDeleteRow(store: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function idbUpdateRow(store: string, id: string, data: Record<string, any>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx       = db.transaction(store, 'readwrite');
    const objStore = tx.objectStore(store);
    const getReq   = objStore.get(id);
    getReq.onsuccess = () => {
      const merged = { ...(getReq.result || {}), ...data, id };
      const putReq = objStore.put(merged);
      putReq.onsuccess = () => resolve();
      putReq.onerror   = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Returns total row count across all stores — used to detect local data before migration */
export async function idbTotalCount(): Promise<number> {
  const db = await openDB();
  const counts = await Promise.all(
    STORES.map(store =>
      new Promise<number>((resolve, reject) => {
        const tx  = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
      })
    )
  );
  return counts.reduce((a, b) => a + b, 0);
}

/** Export all local data as a JSON blob for download */
export async function idbExportAll(): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  for (const store of STORES) {
    result[store] = await idbGetRows(store);
  }
  return result;
}

/** Import data from a previously exported JSON blob */
export async function idbImportAll(dump: Record<string, any[]>): Promise<void> {
  const db = await openDB();
  for (const store of STORES) {
    const rows = dump[store];
    if (!Array.isArray(rows)) continue;
    await new Promise<void>((resolve, reject) => {
      const tx       = db.transaction(store, 'readwrite');
      const objStore = tx.objectStore(store);
      objStore.clear();
      for (const row of rows) objStore.put(row);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
}

/** Trigger browser download of a JSON backup file */
export async function downloadBackup(): Promise<void> {
  const data = await idbExportAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `myfinance-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
