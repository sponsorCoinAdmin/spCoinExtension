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
export declare function createSecretCache<T>(options?: SecretCacheOptions): SecretCache<T>;
