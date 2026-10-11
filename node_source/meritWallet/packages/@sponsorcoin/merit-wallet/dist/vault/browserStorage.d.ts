import type { VaultSessionStore, VaultStorage } from './vaultSession';
export interface IndexedDbVaultStorageOptions {
    /** Defaults to globalThis.indexedDB. */
    factory?: IDBFactory;
    dbName?: string;
    storeName?: string;
    /** The record key inside the object store. */
    key?: string;
}
export declare function createIndexedDbVaultStorage(options?: IndexedDbVaultStorageOptions): VaultStorage;
/** The unlocked session between page loads, in sessionStorage (or any Storage-shaped object). */
export declare function createWebSessionStore(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, key?: string): VaultSessionStore;
