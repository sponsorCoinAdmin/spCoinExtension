export interface PersistedPasswordBlob {
    ivB64: string;
    ciphertextB64: string;
}
/** What a host supplies. The blob store must forget the blob after `ttlMs` (the web's localStorage cache does; a host without expiry can store the expiry itself and answer null once it has passed). */
export interface PersistedPasswordBackend {
    /** The AES-GCM key for this wallet, created (non-extractable, encrypt and decrypt) the first time. */
    getOrCreateKey(): Promise<CryptoKey>;
    readBlob(): PersistedPasswordBlob | null | Promise<PersistedPasswordBlob | null>;
    writeBlob(blob: PersistedPasswordBlob, ttlMs: number): void | Promise<void>;
    deleteBlob(): void | Promise<void>;
}
export interface PersistedPasswordStore {
    /** Encrypt and keep the password for `timeoutHours` (clamped). Never throws. */
    persist(password: string, timeoutHours: number): Promise<void>;
    /** Push the expiry of what is kept back out to a full time limit from now (the wallet was used). A no-op when nothing is kept. Never throws. */
    touch(timeoutHours: number): Promise<void>;
    /** The kept password, or null when nothing is kept, it expired, or it can no longer be decrypted (then it is deleted). */
    restore(): Promise<string | null>;
    /** Forget it now. */
    clear(): Promise<void>;
}
export declare function createPersistedPasswordStore(backend: PersistedPasswordBackend, cryptoImpl?: Crypto): PersistedPasswordStore;
