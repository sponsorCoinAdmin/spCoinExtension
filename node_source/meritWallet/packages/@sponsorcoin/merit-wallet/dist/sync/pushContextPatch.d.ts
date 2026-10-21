import type { EnsureSyncTokenParams } from './syncToken';
export interface PushPlan {
    chainId: number;
    /** The account address as the wallet shows it. */
    address: string;
    /** The lower-case address the server keys the record by. */
    key: string;
    rpcUrl: string;
}
export interface PushHost {
    ensureSyncToken(params: EnsureSyncTokenParams): Promise<string>;
    pushExchangeContextPatch(key: string, patch: unknown, token: string, source: string): Promise<{
        revision: number;
    }>;
    clearSettledMeritApproval(): void;
}
export interface PushHooks {
    /** The server took the patch and gave it this revision (a host records it so it can ignore the echo of its own write). */
    onPushed?(key: string, revision: number): void;
    /** The push failed for any reason. Nothing is thrown; this is the place to log. */
    onFailed?(error: unknown): void;
}
/** Never rejects. Resolves when the push has finished (or failed) and the settled approval has been cleared. */
export declare function pushContextPatch(host: PushHost, plan: PushPlan, patch: unknown, hooks?: PushHooks, source?: string): Promise<void>;
