export interface SecretWatchEnv {
    /** The page whose visibility is watched (document). */
    page: {
        hidden: boolean;
        addEventListener(type: 'visibilitychange', listener: () => void): void;
        removeEventListener(type: 'visibilitychange', listener: () => void): void;
    };
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(handle: unknown): void;
}
/** How long a revealed secret may stay on a screen at most. */
export declare const SECRET_SHOWN_MAX_MS = 60000;
/** How long the Secret Recovery Phrase of a NEW wallet may stay on its screen at most (the person is writing it down). */
export declare const NEW_PHRASE_SHOWN_MAX_MS: number;
export declare function watchSecret(clear: () => void, maxMs: number, env: SecretWatchEnv): () => void;
/** While `shown` is true, clear the secret when the page is hidden or after `maxMs`. */
export declare function useSecretClearing(shown: boolean, clear: () => void, maxMs: number): void;
