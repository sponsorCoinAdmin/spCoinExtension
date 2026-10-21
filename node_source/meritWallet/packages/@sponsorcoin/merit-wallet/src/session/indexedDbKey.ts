// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/session/indexedDbKey.ts
//
// docs/meritMigration.txt row 21. Where the persisted-password AES key lives: ONE record in an IndexedDB store, created the first time as a NON-EXTRACTABLE AES-GCM key (a script on the page can use it but cannot read its bytes).
// This was the web app's openKeyDB / getOrCreateKey; the extension's pages have IndexedDB too, so both hosts call this with their own database name. Pass the IndexedDB and crypto implementations in tests.

export interface IndexedDbKeyOptions {
  dbName: string;
  /** The object store holding the key (created on first open). */
  storeName: string;
  /** The record id of this wallet's key inside the store. */
  recordId: string;
  version?: number;
  indexedDBImpl?: IDBFactory | undefined;
  cryptoImpl?: Crypto;
}

/** A function that returns the wallet's key, creating and saving it the first time. Rejects when IndexedDB is not available (the caller treats that as "not persisted"). */
export function createIndexedDbKeyProvider({ dbName, storeName, recordId, version = 1, indexedDBImpl = typeof indexedDB === 'undefined' ? undefined : indexedDB, cryptoImpl = globalThis.crypto }: IndexedDbKeyOptions): () => Promise<CryptoKey> {
  const openDb = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      if (!indexedDBImpl) {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const req = indexedDBImpl.open(dbName, version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });

  return async () => {
    const db = await openDb();
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(recordId);
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
    if (existing) return existing;
    const key = await cryptoImpl.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(key, recordId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    });
    return key;
  };
}
