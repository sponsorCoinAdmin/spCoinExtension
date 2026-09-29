import { FALLBACK_READ_CACHE_TTL_MS, type CacheEntry, type SpCoinReadCacheMode, type SpCoinReadCacheOptions } from "./types";
import { parseMs } from "./readCacheKeys";

export function getDefaultReadCacheTtlMs(): number {
  const publicTtlMs = parseMs(process.env.NEXT_PUBLIC_SPCOIN_READ_CACHE_TTL_MS);
  if (publicTtlMs !== null && publicTtlMs > 0) return publicTtlMs;
  const serverTtlMs = parseMs(process.env.SPCOIN_READ_CACHE_TTL_MS);
  if (serverTtlMs !== null && serverTtlMs > 0) return serverTtlMs;
  return FALLBACK_READ_CACHE_TTL_MS;
}

export function getCacheMode(options: SpCoinReadCacheOptions): SpCoinReadCacheMode {
  return options.cache || "default";
}

export function getEffectiveTtlMs(options: SpCoinReadCacheOptions) {
  const ttlMs = parseMs(options.ttlMs);
  return ttlMs !== null ? ttlMs : getDefaultReadCacheTtlMs();
}

export function shouldInvalidateExactEntry(options: SpCoinReadCacheOptions): boolean {
  return parseMs(options.ttlMs) === 0;
}

export function allowsLiveRead(options: SpCoinReadCacheOptions): boolean {
  return getCacheMode(options) !== "useCacheOnly";
}

export function isEntryFresh(entry: CacheEntry, options: SpCoinReadCacheOptions) {
  const ttlMs = getEffectiveTtlMs(options);
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return false;
  return Date.now() - entry.cachedAt <= ttlMs;
}

export function getEntryAgeMs(entry: CacheEntry | undefined, nowMs = Date.now()) {
  return entry ? Math.max(0, nowMs - Number(entry.cachedAt || nowMs)) : null;
}
