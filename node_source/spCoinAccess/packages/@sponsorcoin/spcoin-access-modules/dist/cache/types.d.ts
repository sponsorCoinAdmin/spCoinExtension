export type SpCoinReadCacheMode = "default" | "forceRefresh" | "useCacheOnly";
export declare const FALLBACK_READ_CACHE_TTL_MS = 10000;
export interface SpCoinReadCacheOptions {
    cache?: SpCoinReadCacheMode;
    cacheNamespace?: string;
    blockTag?: "latest" | "pending" | number;
    ttlMs?: number;
    traceCache?: boolean;
    timestampOverride?: string | number | bigint;
}
export declare function isReadCacheOptions(value: unknown): value is SpCoinReadCacheOptions;
export declare function splitReadCacheOptions(args: unknown[]): {
    args: unknown[];
    options: SpCoinReadCacheOptions;
};
export interface CacheEntry {
    value: unknown;
    cachedAt: number;
    dependencies: Set<string>;
}
export interface ProviderScopeInfo {
    chainId: string;
    contractAddress: string;
    providerType: string;
    runnerType: string;
    rpcUrl: string;
    scopeSource: string;
}
export interface ClearCacheResult {
    cleared: true;
    entriesBefore: number;
    entriesAfter: number;
}
export interface SetCacheTraceModeResult {
    cacheTraceMode: boolean;
}
