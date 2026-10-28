/** What the signer is asked for: the wallet shows "Authorize Sync" and, unless the user asked, does not interrupt (background). */
export interface SyncSignerRequest {
    chainId: number;
    activeAccountAddress: string;
    rpcUrl: string;
    label: string;
    title: string;
    skipMandatoryApprovalGate: boolean;
    forceRequirePassword: boolean;
    interactive: boolean;
    background: boolean;
}
export interface SyncTokenHost {
    /** A signer for the sync authorization (the web: its connected signer, Merit or MetaMask). */
    getSigner(request: SyncSignerRequest): Promise<{
        signMessage(message: string): Promise<string>;
    }>;
    /** The sync server's sign-in: signs the challenge it gives and returns the token. */
    signInForSync(address: string, sign: (message: string) => Promise<string>): Promise<string>;
    isSyncDisabled(): boolean;
    isSyncAuthorizationRequired(): boolean;
    now?: () => number;
    setTimer?: (fn: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
    /**
     * 2026-10-28, on request ("Authorize Sync popups are appearing unwanted
     * and without notice — track this down") — optional, so test/syncToken.test.mjs's
     * harness (which runs this file's compiled source through `new Function(...)`
     * with NO `require` parameter at all — an `import` here would throw a hard
     * ReferenceError, not just resolve to undefined like meritApproval.ts's own
     * stub-require harness) never needs to supply one; every real call below is
     * `host.trace?.(...)`, a silent no-op when omitted. The web app's host
     * wires this to its own debug trace.
     */
    trace?: (event: string, data: Record<string, unknown>) => void;
}
export interface EnsureSyncTokenParams {
    chainId: number;
    activeAccountAddress: string;
    rpcUrl: string;
    userInitiated?: boolean;
}
export interface SyncTokenProvider {
    ensureSyncToken(params: EnsureSyncTokenParams): Promise<string>;
    /** Forget the token and any scheduled refresh (tests, and a host that signs the user out). */
    reset(): void;
}
/** A token is replaced when it has less than this long left. */
export declare const REFRESH_LEAD_MS = 90000;
/** The expiry (ms since the epoch) written into a token, or null when the text is not a token. */
export declare function parseTokenExpiresAt(token: string): number | null;
export declare function createSyncTokenProvider(host: SyncTokenHost): SyncTokenProvider;
