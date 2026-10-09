// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/vaultSession.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E1) -- the vault's lock state and lifecycle, the MetaMask KeyringController shape: one encrypted vault
// in storage; unlock decrypts it into memory and keeps the derived key for the session; every change re-encrypts with that key and writes it back
// without asking for the password again; lock (manual or auto-lock timer) drops the decrypted data and the key. The wallet UI never touches the
// decrypted data: it asks the host that owns this session (the extension's background worker) for the results of operations.
//
// Pure TypeScript over WebCrypto, with the storage and the timers injected, so it runs in a service worker, a page, and in tests.
import {
  DEFAULT_PBKDF2_ITERATIONS,
  WrongPasswordError,
  createEncryptedVault,
  decryptWithKey,
  encryptWithKey,
  fromBase64,
  toBase64,
  unlockEncryptedVault,
  type EncryptedVault,
} from './vaultCrypto';

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
export class TooManyAttemptsError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Too many incorrect passwords. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`);
    this.name = 'TooManyAttemptsError';
  }
}

export class VaultLockedError extends Error {
  constructor() {
    super('The wallet is locked.');
    this.name = 'VaultLockedError';
  }
}

export class VaultSession<T = unknown> {
  private readonly storage: VaultStorage;
  private readonly iterations: number;
  private autoLockMs: number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;
  private readonly sessionStore: VaultSessionStore | undefined;
  private readonly now: () => number;
  private readonly maxAttempts: number;
  private readonly lockoutMs: number;
  private failedAttempts = 0;
  private blockedUntil = 0;

  private data: T | undefined;
  private key: CryptoKey | undefined;
  private salt: Uint8Array | undefined;
  private vaultIterations = DEFAULT_PBKDF2_ITERATIONS;
  private timer: unknown;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();

  constructor(options: VaultSessionOptions) {
    this.storage = options.storage;
    this.iterations = options.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
    this.autoLockMs = options.autoLockMs ?? 0;
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
    this.sessionStore = options.sessionStore;
    this.now = options.now ?? (() => Date.now());
    this.maxAttempts = options.maxAttempts ?? 5;
    this.lockoutMs = options.lockoutMs ?? 30_000;
  }

  /**
   * Run one password check under the guess limit. After `maxAttempts` wrong passwords in a row the next tries are refused (TooManyAttemptsError)
   * for a period that doubles with each further wrong guess; a correct password clears the count. The counter lives in memory, so it also
   * restarts when the host restarts; it exists to slow down a script driving the wallet, not to replace a strong password.
   */
  private async guarded<R>(check: () => Promise<R>): Promise<R> {
    const wait = this.blockedUntil - this.now();
    if (wait > 0) throw new TooManyAttemptsError(wait);
    try {
      const result = await check();
      this.failedAttempts = 0;
      this.blockedUntil = 0;
      return result;
    } catch (error) {
      if (error instanceof WrongPasswordError) {
        this.failedAttempts += 1;
        if (this.failedAttempts >= this.maxAttempts) {
          this.blockedUntil = this.now() + Math.min(this.lockoutMs * 2 ** (this.failedAttempts - this.maxAttempts), 15 * 60_000);
        }
      }
      throw error;
    }
  }

  /**
   * After the host restarted: if a session was persisted and is still within the auto-lock time, decrypt the vault with the saved key and come
   * back unlocked, with no password. Returns whether it did. Any problem (no session, expired, key no longer fits the vault) leaves the wallet locked.
   */
  async restore(): Promise<boolean> {
    return this.serialize(async () => {
      if (!this.sessionStore || this.isUnlocked()) return this.isUnlocked();
      const saved = await this.sessionStore.get();
      if (!saved) return false;
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
        const data = await decryptWithKey<T>(vault, key);
        this.adopt(data, key, fromBase64(saved.salt), saved.iterations, false);
        return true;
      } catch {
        await this.sessionStore.clear();
        return false;
      }
    });
  }

  /** Is there a vault in storage at all (false before the wallet is set up). */
  async isInitialized(): Promise<boolean> {
    return (await this.storage.read()) !== undefined;
  }

  isUnlocked(): boolean {
    return this.key !== undefined && this.data !== undefined;
  }

  /** The decrypted contents. Only while unlocked; the caller must not keep or log them. */
  getData(): T {
    if (!this.isUnlocked()) throw new VaultLockedError();
    this.touch();
    return this.data as T;
  }

  /** Set up the wallet: encrypt `initial` under `password`, store it, and leave the session unlocked. */
  async create(password: string, initial: T): Promise<void> {
    return this.serialize(async () => {
      if (await this.isInitialized()) throw new Error('A vault already exists; wipe it first to create a new one.');
      const { vault, key, salt } = await createEncryptedVault(initial, password, this.iterations, !!this.sessionStore);
      await this.storage.write(vault);
      this.adopt(initial, key, salt, vault.iterations);
    });
  }

  /** Decrypt the stored vault into memory. Throws WrongPasswordError for a wrong password. */
  async unlock(password: string): Promise<void> {
    return this.serialize(async () => {
      const vault = await this.storage.read();
      if (!vault) throw new Error('No vault to unlock: set up the wallet first.');
      const { data, key, salt } = await this.guarded(() => unlockEncryptedVault<T>(vault, password, !!this.sessionStore));
      this.adopt(data, key, salt, vault.iterations);
    });
  }

  /** Drop the decrypted data and the key. The vault stays in storage. */
  lock(): void {
    const wasUnlocked = this.isUnlocked();
    this.data = undefined;
    this.key = undefined;
    this.salt = undefined;
    this.cancelTimer();
    void this.sessionStore?.clear().catch(() => undefined);
    if (wasUnlocked) this.emit();
  }

  /** Change the contents: `mutate` receives the current data and returns the new data. Re-encrypted with the session key and stored. */
  async update(mutate: (current: T) => T): Promise<void> {
    return this.serialize(async () => {
      if (!this.isUnlocked()) throw new VaultLockedError();
      const next = mutate(this.data as T);
      const vault = await encryptWithKey(next, this.key as CryptoKey, this.salt as Uint8Array, this.vaultIterations);
      await this.storage.write(vault);
      this.data = next;
      this.touch();
    });
  }

  /** Check a password against the stored vault without changing the session (MetaMask asks again before it reveals the recovery phrase). Throws WrongPasswordError. */
  async verifyPassword(password: string): Promise<void> {
    const stored = await this.storage.read();
    if (!stored) throw new Error('No vault to check the password against.');
    await this.guarded(() => unlockEncryptedVault(stored, password));
  }

  /** Verify the old password against the stored vault, then re-encrypt everything under a fresh salt and key derived from the new one. */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.serialize(async () => {
      const stored = await this.storage.read();
      if (!stored) throw new Error('No vault to change the password of.');
      const { data } = await this.guarded(() => unlockEncryptedVault<T>(stored, oldPassword));
      const { vault, key, salt } = await createEncryptedVault(data, newPassword, this.iterations, !!this.sessionStore);
      await this.storage.write(vault);
      this.adopt(data, key, salt, vault.iterations);
    });
  }

  /** The encrypted vault exactly as stored, for a backup file. It is ciphertext: useless without the password. */
  async exportBackup(): Promise<EncryptedVault> {
    const stored = await this.storage.read();
    if (!stored) throw new Error('There is no vault to back up.');
    return stored;
  }

  /** Restore a backup made by exportBackup. The password must open it; an existing vault must be wiped first. Leaves the session unlocked. */
  async importBackup(vault: EncryptedVault, password: string): Promise<void> {
    return this.serialize(async () => {
      if (await this.isInitialized()) throw new Error('A vault already exists; wipe it first to restore a backup.');
      const { data, key, salt } = await this.guarded(() => unlockEncryptedVault<T>(vault, password, !!this.sessionStore));
      await this.storage.write(vault);
      this.adopt(data, key, salt, vault.iterations);
    });
  }

  /** Forgot the password: delete the vault (MetaMask: reset the wallet, then import again). Irreversible. */
  async wipe(): Promise<void> {
    return this.serialize(async () => {
      this.lock();
      await this.storage.clear();
    });
  }

  /** Activity: restart the auto-lock countdown. */
  touch(): void {
    this.cancelTimer();
    if (this.autoLockMs > 0 && this.isUnlocked()) this.timer = this.setTimer(() => this.lock(), this.autoLockMs);
    if (this.isUnlocked()) void this.persistSession();
  }

  setAutoLockMs(ms: number): void {
    this.autoLockMs = Math.max(0, ms);
    this.touch();
  }

  /** Subscribe to lock / unlock; returns the unsubscribe function. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async persistSession(): Promise<void> {
    if (!this.sessionStore || !this.key || !this.salt) return;
    try {
      const jwk = await crypto.subtle.exportKey('jwk', this.key);
      await this.sessionStore.set({ key: jwk, salt: toBase64(this.salt), iterations: this.vaultIterations, lastActivity: this.now() });
    } catch {
      // The key was derived non-extractable (no session store at creation); nothing to persist.
    }
  }

  private adopt(data: T, key: CryptoKey, salt: Uint8Array, iterations: number, announce = true): void {
    const wasUnlocked = this.isUnlocked();
    this.data = data;
    this.key = key;
    this.salt = salt;
    this.vaultIterations = iterations;
    this.touch();
    if (!wasUnlocked && announce) this.emit();
  }

  private cancelTimer(): void {
    if (this.timer !== undefined) {
      this.clearTimer(this.timer);
      this.timer = undefined;
    }
  }

  private emit(): void {
    for (const l of Array.from(this.listeners)) l();
  }

  /** One operation at a time: two updates racing could otherwise overwrite each other's write. */
  private serialize<R>(op: () => Promise<R>): Promise<R> {
    const run = this.queue.then(op, op);
    this.queue = run.catch(() => undefined);
    return run;
  }
}

export { WrongPasswordError };
