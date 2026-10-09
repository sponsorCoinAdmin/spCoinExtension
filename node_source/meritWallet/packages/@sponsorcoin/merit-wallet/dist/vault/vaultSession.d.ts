import { WrongPasswordError, type EncryptedVault } from './vaultCrypto';
/** Where the encrypted vault lives (chrome.storage.local in the extension). Holds ciphertext only. */
export interface VaultStorage {
    read(): Promise<EncryptedVault | undefined>;
    write(vault: EncryptedVault): Promise<void>;
    clear(): Promise<void>;
}
/**
 * Memory-only storage that survives the host process being stopped and restarted but not the browser closing (chrome.storage.session in an
 * extension). MetaMask keeps its vault key there so an MV3 service worker that Chrome stops after a few idle seconds does not re-lock the wallet.
 * It holds the exported session key, never the password, and never the decrypted data.
 */
export interface VaultSessionStore {
    get(): Promise<PersistedVaultSession | undefined>;
    set(value: PersistedVaultSession): Promise<void>;
    clear(): Promise<void>;
}
export interface PersistedVaultSession {
    key: JsonWebKey;
    salt: string;
    iterations: number;
    /** Time of the last activity (ms since epoch), so a restore after the auto-lock time stays locked. */
    lastActivity: number;
}
export interface VaultSessionOptions {
    storage: VaultStorage;
    /** PBKDF2 iterations for NEW vaults (default 600,000). An existing vault keeps the count it was made with. */
    iterations?: number;
    /** Lock after this many ms without activity. 0 or omitted: never auto-lock. */
    autoLockMs?: number;
    /** Keep the unlocked session across a host restart (the key is then derived extractable so it can be exported). Omit to relock on restart. */
    sessionStore?: VaultSessionStore;
    /** Wrong-password guesses allowed in a row before the vault refuses further tries for a while (default 5). */
    maxAttempts?: number;
    /** First refusal period in ms; it doubles with each further wrong guess, up to 15 minutes (default 30,000). */
    lockoutMs?: number;
    /** Clock, injectable for tests. */
    now?: () => number;
    /** Timer functions, injectable for tests. */
    setTimer?: (fn: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}
/** Too many wrong passwords in a row: no more tries until `retryAfterMs` has passed. */
export declare class TooManyAttemptsError extends Error {
    readonly retryAfterMs: number;
    constructor(retryAfterMs: number);
}
export declare class VaultLockedError extends Error {
    constructor();
}
export declare class VaultSession<T = unknown> {
    private readonly storage;
    private readonly iterations;
    private autoLockMs;
    private readonly setTimer;
    private readonly clearTimer;
    private readonly sessionStore;
    private readonly now;
    private readonly maxAttempts;
    private readonly lockoutMs;
    private failedAttempts;
    private blockedUntil;
    private data;
    private key;
    private salt;
    private vaultIterations;
    private timer;
    private queue;
    private listeners;
    constructor(options: VaultSessionOptions);
    /**
     * Run one password check under the guess limit. After `maxAttempts` wrong passwords in a row the next tries are refused (TooManyAttemptsError)
     * for a period that doubles with each further wrong guess; a correct password clears the count. The counter lives in memory, so it also
     * restarts when the host restarts; it exists to slow down a script driving the wallet, not to replace a strong password.
     */
    private guarded;
    /**
     * After the host restarted: if a session was persisted and is still within the auto-lock time, decrypt the vault with the saved key and come
     * back unlocked, with no password. Returns whether it did. Any problem (no session, expired, key no longer fits the vault) leaves the wallet locked.
     */
    restore(): Promise<boolean>;
    /** Is there a vault in storage at all (false before the wallet is set up). */
    isInitialized(): Promise<boolean>;
    isUnlocked(): boolean;
    /** The decrypted contents. Only while unlocked; the caller must not keep or log them. */
    getData(): T;
    /** Set up the wallet: encrypt `initial` under `password`, store it, and leave the session unlocked. */
    create(password: string, initial: T): Promise<void>;
    /** Decrypt the stored vault into memory. Throws WrongPasswordError for a wrong password. */
    unlock(password: string): Promise<void>;
    /** Drop the decrypted data and the key. The vault stays in storage. */
    lock(): void;
    /** Change the contents: `mutate` receives the current data and returns the new data. Re-encrypted with the session key and stored. */
    update(mutate: (current: T) => T): Promise<void>;
    /** Check a password against the stored vault without changing the session (MetaMask asks again before it reveals the recovery phrase). Throws WrongPasswordError. */
    verifyPassword(password: string): Promise<void>;
    /** Verify the old password against the stored vault, then re-encrypt everything under a fresh salt and key derived from the new one. */
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
    /** The encrypted vault exactly as stored, for a backup file. It is ciphertext: useless without the password. */
    exportBackup(): Promise<EncryptedVault>;
    /** Restore a backup made by exportBackup. The password must open it; an existing vault must be wiped first. Leaves the session unlocked. */
    importBackup(vault: EncryptedVault, password: string): Promise<void>;
    /** Forgot the password: delete the vault (MetaMask: reset the wallet, then import again). Irreversible. */
    wipe(): Promise<void>;
    /** Activity: restart the auto-lock countdown. */
    touch(): void;
    setAutoLockMs(ms: number): void;
    /** Subscribe to lock / unlock; returns the unsubscribe function. */
    onChange(listener: () => void): () => void;
    private persistSession;
    private adopt;
    private cancelTimer;
    private emit;
    /** One operation at a time: two updates racing could otherwise overwrite each other's write. */
    private serialize;
}
export { WrongPasswordError };
