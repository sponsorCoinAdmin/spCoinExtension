// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/vaultSession.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E1) -- the vault's lock state and lifecycle, the MetaMask KeyringController shape: one encrypted vault
// in storage; unlock decrypts it into memory and keeps the derived key for the session; every change re-encrypts with that key and writes it back
// without asking for the password again; lock (manual or auto-lock timer) drops the decrypted data and the key. The wallet UI never touches the
// decrypted data: it asks the host that owns this session (the extension's background worker) for the results of operations.
//
// Pure TypeScript over WebCrypto, with the storage and the timers injected, so it runs in a service worker, a page, and in tests.
import { DEFAULT_PBKDF2_ITERATIONS, WrongPasswordError, createEncryptedVault, decryptWithKey, encryptWithKey, fromBase64, toBase64, unlockEncryptedVault, } from './vaultCrypto';
/** Too many wrong passwords in a row: no more tries until `retryAfterMs` has passed. */
export class TooManyAttemptsError extends Error {
    constructor(retryAfterMs) {
        super(`Too many incorrect passwords. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`);
        this.retryAfterMs = retryAfterMs;
        this.name = 'TooManyAttemptsError';
    }
}
export class VaultLockedError extends Error {
    constructor() {
        super('The wallet is locked.');
        this.name = 'VaultLockedError';
    }
}
export class VaultSession {
    constructor(options) {
        this.failedAttempts = 0;
        this.blockedUntil = 0;
        this.vaultIterations = DEFAULT_PBKDF2_ITERATIONS;
        this.queue = Promise.resolve();
        this.listeners = new Set();
        this.storage = options.storage;
        this.iterations = options.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
        this.autoLockMs = options.autoLockMs ?? 0;
        this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
        this.clearTimer = options.clearTimer ?? ((h) => clearTimeout(h));
        this.sessionStore = options.sessionStore;
        this.now = options.now ?? (() => Date.now());
        this.maxAttempts = options.maxAttempts ?? 5;
        this.lockoutMs = options.lockoutMs ?? 30000;
    }
    /**
     * Run one password check under the guess limit. After `maxAttempts` wrong passwords in a row the next tries are refused (TooManyAttemptsError)
     * for a period that doubles with each further wrong guess; a correct password clears the count. The counter lives in memory, so it also
     * restarts when the host restarts; it exists to slow down a script driving the wallet, not to replace a strong password.
     */
    async guarded(check) {
        const wait = this.blockedUntil - this.now();
        if (wait > 0)
            throw new TooManyAttemptsError(wait);
        try {
            const result = await check();
            this.failedAttempts = 0;
            this.blockedUntil = 0;
            return result;
        }
        catch (error) {
            if (error instanceof WrongPasswordError) {
                this.failedAttempts += 1;
                if (this.failedAttempts >= this.maxAttempts) {
                    this.blockedUntil = this.now() + Math.min(this.lockoutMs * 2 ** (this.failedAttempts - this.maxAttempts), 15 * 60000);
                }
            }
            throw error;
        }
    }
    /**
     * After the host restarted: if a session was persisted and is still within the auto-lock time, decrypt the vault with the saved key and come
     * back unlocked, with no password. Returns whether it did. Any problem (no session, expired, key no longer fits the vault) leaves the wallet locked.
     */
    async restore() {
        return this.serialize(async () => {
            if (!this.sessionStore || this.isUnlocked())
                return this.isUnlocked();
            const saved = await this.sessionStore.get();
            if (!saved)
                return false;
            if (this.autoLockMs > 0 && this.now() - saved.lastActivity > this.autoLockMs) {
                await this.sessionStore.clear();
                return false;
            }
            try {
                const vault = await this.storage.read();
                if (!vault) {
                    await this.sessionStore.clear();
                    return false;
                }
                const key = await crypto.subtle.importKey('jwk', saved.key, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
                const data = await decryptWithKey(vault, key);
                this.adopt(data, key, fromBase64(saved.salt), saved.iterations, false);
                return true;
            }
            catch {
                await this.sessionStore.clear();
                return false;
            }
        });
    }
    /** Is there a vault in storage at all (false before the wallet is set up). */
    async isInitialized() {
        return (await this.storage.read()) !== undefined;
    }
    isUnlocked() {
        return this.key !== undefined && this.data !== undefined;
    }
    /** The decrypted contents. Only while unlocked; the caller must not keep or log them. */
    getData() {
        if (!this.isUnlocked())
            throw new VaultLockedError();
        this.touch();
        return this.data;
    }
    /** Set up the wallet: encrypt `initial` under `password`, store it, and leave the session unlocked. */
    async create(password, initial) {
        return this.serialize(async () => {
            if (await this.isInitialized())
                throw new Error('A vault already exists; wipe it first to create a new one.');
            const { vault, key, salt } = await createEncryptedVault(initial, password, this.iterations, !!this.sessionStore);
            await this.storage.write(vault);
            this.adopt(initial, key, salt, vault.iterations);
        });
    }
    /** Decrypt the stored vault into memory. Throws WrongPasswordError for a wrong password. */
    async unlock(password) {
        return this.serialize(async () => {
            const vault = await this.storage.read();
            if (!vault)
                throw new Error('No vault to unlock: set up the wallet first.');
            const { data, key, salt } = await this.guarded(() => unlockEncryptedVault(vault, password, !!this.sessionStore));
            this.adopt(data, key, salt, vault.iterations);
        });
    }
    /** Drop the decrypted data and the key. The vault stays in storage. */
    lock() {
        const wasUnlocked = this.isUnlocked();
        this.data = undefined;
        this.key = undefined;
        this.salt = undefined;
        this.cancelTimer();
        void this.sessionStore?.clear().catch(() => undefined);
        if (wasUnlocked)
            this.emit();
    }
    /** Change the contents: `mutate` receives the current data and returns the new data. Re-encrypted with the session key and stored. */
    async update(mutate) {
        return this.serialize(async () => {
            if (!this.isUnlocked())
                throw new VaultLockedError();
            const next = mutate(this.data);
            const vault = await encryptWithKey(next, this.key, this.salt, this.vaultIterations);
            await this.storage.write(vault);
            this.data = next;
            this.touch();
        });
    }
    /** Check a password against the stored vault without changing the session (MetaMask asks again before it reveals the recovery phrase). Throws WrongPasswordError. */
    async verifyPassword(password) {
        const stored = await this.storage.read();
        if (!stored)
            throw new Error('No vault to check the password against.');
        await this.guarded(() => unlockEncryptedVault(stored, password));
    }
    /** Verify the old password against the stored vault, then re-encrypt everything under a fresh salt and key derived from the new one. */
    async changePassword(oldPassword, newPassword) {
        return this.serialize(async () => {
            const stored = await this.storage.read();
            if (!stored)
                throw new Error('No vault to change the password of.');
            const { data } = await this.guarded(() => unlockEncryptedVault(stored, oldPassword));
            const { vault, key, salt } = await createEncryptedVault(data, newPassword, this.iterations, !!this.sessionStore);
            await this.storage.write(vault);
            this.adopt(data, key, salt, vault.iterations);
        });
    }
    /** The encrypted vault exactly as stored, for a backup file. It is ciphertext: useless without the password. */
    async exportBackup() {
        const stored = await this.storage.read();
        if (!stored)
            throw new Error('There is no vault to back up.');
        return stored;
    }
    /** Restore a backup made by exportBackup. The password must open it; an existing vault must be wiped first. Leaves the session unlocked. */
    async importBackup(vault, password) {
        return this.serialize(async () => {
            if (await this.isInitialized())
                throw new Error('A vault already exists; wipe it first to restore a backup.');
            const { data, key, salt } = await this.guarded(() => unlockEncryptedVault(vault, password, !!this.sessionStore));
            await this.storage.write(vault);
            this.adopt(data, key, salt, vault.iterations);
        });
    }
    /** Forgot the password: delete the vault (MetaMask: reset the wallet, then import again). Irreversible. */
    async wipe() {
        return this.serialize(async () => {
            this.lock();
            await this.storage.clear();
        });
    }
    /** Activity: restart the auto-lock countdown. */
    touch() {
        this.cancelTimer();
        if (this.autoLockMs > 0 && this.isUnlocked())
            this.timer = this.setTimer(() => this.lock(), this.autoLockMs);
        if (this.isUnlocked())
            void this.persistSession();
    }
    setAutoLockMs(ms) {
        this.autoLockMs = Math.max(0, ms);
        this.touch();
    }
    /** Subscribe to lock / unlock; returns the unsubscribe function. */
    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    async persistSession() {
        if (!this.sessionStore || !this.key || !this.salt)
            return;
        try {
            const jwk = await crypto.subtle.exportKey('jwk', this.key);
            await this.sessionStore.set({ key: jwk, salt: toBase64(this.salt), iterations: this.vaultIterations, lastActivity: this.now() });
        }
        catch {
            // The key was derived non-extractable (no session store at creation); nothing to persist.
        }
    }
    adopt(data, key, salt, iterations, announce = true) {
        const wasUnlocked = this.isUnlocked();
        this.data = data;
        this.key = key;
        this.salt = salt;
        this.vaultIterations = iterations;
        this.touch();
        if (!wasUnlocked && announce)
            this.emit();
    }
    cancelTimer() {
        if (this.timer !== undefined) {
            this.clearTimer(this.timer);
            this.timer = undefined;
        }
    }
    emit() {
        for (const l of Array.from(this.listeners))
            l();
    }
    /** One operation at a time: two updates racing could otherwise overwrite each other's write. */
    serialize(op) {
        const run = this.queue.then(op, op);
        this.queue = run.catch(() => undefined);
        return run;
    }
}
export { WrongPasswordError };
