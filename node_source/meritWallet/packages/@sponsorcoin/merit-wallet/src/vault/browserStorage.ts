// File: src/vault/browserStorage.ts
//
// 2026-10-11 (docs/authenticationDesign.txt 14.4, item V4) -- the BROWSER vault's two storage adapters. The encryption, the unlock, auto-lock and the wrong-password limit are the vault's own shared code (vaultSession.ts);
// a store only has to keep ciphertext:
//   - createIndexedDbVaultStorage: where the ENCRYPTED vault lives (IndexedDB: survives closing the browser; unlike localStorage it is not synchronous and not shared with every script that reads window.localStorage by key).
//   - createWebSessionStore: where the unlocked SESSION key lives between page loads (sessionStorage: gone when the tab or browser closes). It holds the exported session key, never the password and never the decrypted data,
//     the same arrangement the extension has with chrome.storage.session.
// Both take the browser API as a parameter (defaulting to globalThis), so they run under a test with a small fake and in any host that has IndexedDB / sessionStorage.
import type { EncryptedVault } from './vaultCrypto';
import type { PersistedVaultSession, VaultSessionStore, VaultStorage } from './vaultSession';

export interface IndexedDbVaultStorageOptions {
  /** Defaults to globalThis.indexedDB. */
  factory?: IDBFactory;
  dbName?: string;
  storeName?: string;
  /** The record key inside the object store. */
  key?: string;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed.'));
  });
}

export function createIndexedDbVaultStorage(options: IndexedDbVaultStorageOptions = {}): VaultStorage {
  const dbName = options.dbName ?? 'merit-wallet-vault';
  const storeName = options.storeName ?? 'vault';
  const key = options.key ?? 'vault';
  let opened: Promise<IDBDatabase> | undefined;

  const open = (): Promise<IDBDatabase> => {
    const factory = options.factory ?? (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (!factory) return Promise.reject(new Error('This browser has no IndexedDB, so a browser wallet cannot be kept here.'));
    opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(dbName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        opened = undefined;
        reject(req.error ?? new Error('Could not open the wallet database.'));
      };
    });
    return opened;
  };
  const store = async (mode: IDBTransactionMode) => (await open()).transaction(storeName, mode).objectStore(storeName);

  return {
    async read() {
      const value = await request((await store('readonly')).get(key));
      return (value as EncryptedVault | undefined) ?? undefined;
    },
    async write(vault) {
      await request((await store('readwrite')).put(vault, key));
    },
    async clear() {
      await request((await store('readwrite')).delete(key));
    },
  };
}

/** The unlocked session between page loads, in sessionStorage (or any Storage-shaped object). */
export function createWebSessionStore(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, key = 'merit-wallet-session'): VaultSessionStore {
  const area = () => storage ?? (globalThis as { sessionStorage?: Storage }).sessionStorage;
  return {
    async get() {
      try {
        const raw = area()?.getItem(key);
        return raw ? (JSON.parse(raw) as PersistedVaultSession) : undefined;
      } catch {
        return undefined;
      }
    },
    async set(value) {
      try {
        area()?.setItem(key, JSON.stringify(value));
      } catch {
        /* storage full or blocked: the wallet simply asks for the password after a reload */
      }
    },
    async clear() {
      try {
        area()?.removeItem(key);
      } catch {
        /* nothing to clear */
      }
    },
  };
}
