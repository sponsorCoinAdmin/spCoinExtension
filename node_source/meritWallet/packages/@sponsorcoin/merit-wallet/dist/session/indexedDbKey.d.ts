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
export declare function createIndexedDbKeyProvider({ dbName, storeName, recordId, version, indexedDBImpl, cryptoImpl }: IndexedDbKeyOptions): () => Promise<CryptoKey>;
