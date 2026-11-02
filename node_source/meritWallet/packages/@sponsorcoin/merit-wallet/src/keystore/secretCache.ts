// File: src/keystore/secretCache.ts
//
// 2026-11-02 (owner design: a nested security library, the secured-keys cache beside the public one): the cache for SECRETS (an unlocked master key, a derived signing key, a session password). The opposite of PublicAccountStore in one rule: it lives in MEMORY ONLY.
// There is no read/write to any storage here and none to add: a page reload, a lock, an idle timeout or clear() all empty it. Each app keeps its secrets in one of these (web: the page; extension: the background worker; phone: the app process, with the OS secure
// store behind its own unlock), so the rules (idle expiry, wipe on lock, never persisted) are the same everywhere. Not yet wired into the existing web session (components/wallet/lib/meritConnect/session.ts) or the worker vault: this is the shared contract they move onto.
export interface SecretCache<T> {
  /** Keep a secret; restarts the idle clock. */
  put(secret: T): void;
  /** The secret, or undefined when none is held or the idle time ran out. Reading restarts the idle clock. */
  get(): T | undefined;
  has(): boolean;
  /** Wipe it now (lock, logout, delete wallet). */
  clear(): void;
  /** Told when the secret goes away (clear or idle expiry), so a host can flip its UI to locked. */
  onCleared(listener: () => void): () => void;
}

export interface SecretCacheOptions {
  /** Idle time after which the secret is wiped; 0 or undefined means it is held until clear(). */
  idleMs?: number;
  /** Injected for tests. */
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export function createSecretCache<T>(options: SecretCacheOptions = {}): SecretCache<T> {
  const { idleMs = 0, now = Date.now, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (h) => clearTimeout(h as ReturnType<typeof setTimeout>) } = options;
  let held: { value: T } | undefined;
  let timer: unknown;
  let lastUsed = 0;
  const listeners = new Set<() => void>();

  const stopTimer = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  };
  const wipe = () => {
    const had = held !== undefined;
    held = undefined;
    stopTimer();
    if (had) listeners.forEach((listener) => listener());
  };
  const arm = () => {
    lastUsed = now();
    stopTimer();
    if (idleMs > 0) timer = setTimer(wipe, idleMs);
  };

  return {
    put(secret) {
      held = { value: secret };
      arm();
    },
    get() {
      if (!held) return undefined;
      // a timer that was throttled (a background tab) must not keep a secret past its time
      if (idleMs > 0 && now() - lastUsed >= idleMs) {
        wipe();
        return undefined;
      }
      arm();
      return held.value;
    },
    has: () => held !== undefined && !(idleMs > 0 && now() - lastUsed >= idleMs),
    clear: wipe,
    onCleared(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
