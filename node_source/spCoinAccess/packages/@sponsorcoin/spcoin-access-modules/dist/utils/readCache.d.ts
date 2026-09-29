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
export declare function normalizeAddress(value: unknown): string;
export declare function parseMs(value: unknown): number | null;
export declare function stableJson(value: unknown): string;
export declare function getContractAddress(context: unknown): string;
export declare function getProviderScopeInfo(context: unknown): ProviderScopeInfo;
export declare function getChainId(context: unknown): string;
export declare function buildReadCacheKey(context: unknown, method: string, args: unknown[], options?: SpCoinReadCacheOptions): string;
export declare function compactKey(value: string): string;
export declare function serializeTraceArg(value: unknown): string;
export declare function configureDefaultReadCacheTtlEnv(env: {
    publicTtlMs?: string;
    serverTtlMs?: string;
}): void;
export declare function getDefaultReadCacheTtlMs(): number;
export declare function getCacheMode(options: SpCoinReadCacheOptions): SpCoinReadCacheMode;
export declare function getEffectiveTtlMs(options: SpCoinReadCacheOptions): number;
export declare function shouldInvalidateExactEntry(options: SpCoinReadCacheOptions): boolean;
export declare function allowsLiveRead(options: SpCoinReadCacheOptions): boolean;
export declare function isEntryFresh(entry: CacheEntry, options: SpCoinReadCacheOptions): boolean;
export declare function getEntryAgeMs(entry: CacheEntry | undefined, nowMs?: number): number;
export declare function getCacheEntry(key: string): CacheEntry | undefined;
export declare function setCacheEntry(key: string, value: unknown, dependencies: Set<string>): void;
export declare function invalidateReadCacheEntry(key: string): number;
export declare function invalidateReadCacheByDependency(dependency: string): number;
export declare function invalidateReadCacheByDependencies(dependencies: Iterable<string>): number;
export declare function invalidateReadCacheForAccount(accountKey: string): number;
export declare function invalidateReadCacheForContract(contractAddress: string, chainId?: string): number;
export declare function clearReadCache(): void;
export declare function clearCache(): ClearCacheResult;
export declare function getReadCacheSize(): number;
export declare function getCacheTraceMode(): boolean;
export declare function setCacheTraceMode(enabled: boolean): SetCacheTraceModeResult;
export declare function buildReadCacheDependencies(context: unknown, method: string, args: unknown[]): Set<string>;
export declare function invalidateAfterWrite(methodName: string, args?: unknown[]): number;
export declare function invalidateAfterAccountWrite(accountKey: string): number;
export declare function runCachedRead(context: unknown, method: string, args: unknown[], options: SpCoinReadCacheOptions, loader: () => Promise<unknown> | unknown): Promise<unknown>;
