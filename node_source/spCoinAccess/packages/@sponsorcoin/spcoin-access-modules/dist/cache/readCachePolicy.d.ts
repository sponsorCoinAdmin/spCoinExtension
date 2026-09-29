import { type CacheEntry, type SpCoinReadCacheMode, type SpCoinReadCacheOptions } from "./types";
export declare function getDefaultReadCacheTtlMs(): number;
export declare function getCacheMode(options: SpCoinReadCacheOptions): SpCoinReadCacheMode;
export declare function getEffectiveTtlMs(options: SpCoinReadCacheOptions): number;
export declare function shouldInvalidateExactEntry(options: SpCoinReadCacheOptions): boolean;
export declare function allowsLiveRead(options: SpCoinReadCacheOptions): boolean;
export declare function isEntryFresh(entry: CacheEntry, options: SpCoinReadCacheOptions): boolean;
export declare function getEntryAgeMs(entry: CacheEntry | undefined, nowMs?: number): number;
