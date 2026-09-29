import type { FetchJsonConfig } from '../shared/fetchJson';
export interface ExchangeContextEntry {
    apiCoreSyncedMembers: unknown;
    updatedAt: number;
    revision: number;
    /** SHA-256 of the server's canonical serialization — see the web app's own contentHash.ts. */
    contentHash: string;
    source?: string;
}
/**
 * GET /api/exchangeContext?key=<address> — read-only, unauthenticated by
 * design (the web app's own route.ts: "reading isn't the sensitive
 * operation"). Requires the caller's origin to be allow-listed
 * server-side (MERIT_EXTENSION_ORIGIN) when called cross-origin — see
 * the web app's exchangeContextCors.ts.
 */
export declare function fetchExchangeContextEntry(key: string, config?: FetchJsonConfig): Promise<ExchangeContextEntry>;
