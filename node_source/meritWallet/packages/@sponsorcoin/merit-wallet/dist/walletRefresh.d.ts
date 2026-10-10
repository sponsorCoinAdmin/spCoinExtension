export interface WalletRefreshCallbacks {
    /** Drop caches that would otherwise serve stale data (runs first). Errors are the host's to swallow; a throw aborts the refresh. */
    invalidate?: () => Promise<void> | void;
    /** Reload whatever the host itself owns (runs second, after invalidate). */
    reload?: () => Promise<void> | void;
}
export interface WalletRefreshState {
    refreshing: boolean;
    /** Bumped once per completed refresh, AFTER invalidate and reload; pass it to MeritWallet's refreshToken prop. */
    refreshToken: number;
}
export interface WalletRefreshController {
    getState: () => WalletRefreshState;
    /** Runs one refresh. A call made while one is already running is ignored. */
    run: () => Promise<void>;
}
/** Framework-free refresh sequence. onChange fires after every state change (host re-renders from getState()). */
export declare function createWalletRefresh(callbacks: WalletRefreshCallbacks, onChange?: () => void): WalletRefreshController;
/** React form for component hosts. The callbacks are read through a ref, so they may change identity every render. */
export declare function useWalletRefresh(callbacks: WalletRefreshCallbacks): WalletRefreshState & {
    refresh: () => Promise<void>;
};
