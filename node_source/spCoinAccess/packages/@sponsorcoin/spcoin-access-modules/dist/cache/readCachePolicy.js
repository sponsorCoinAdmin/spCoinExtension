import { FALLBACK_READ_CACHE_TTL_MS } from "./types";
import { parseMs } from "./readCacheKeys";
export function getDefaultReadCacheTtlMs() {
    const publicTtlMs = parseMs(process.env.NEXT_PUBLIC_SPCOIN_READ_CACHE_TTL_MS);
    if (publicTtlMs !== null && publicTtlMs > 0)
        return publicTtlMs;
    const serverTtlMs = parseMs(process.env.SPCOIN_READ_CACHE_TTL_MS);
    if (serverTtlMs !== null && serverTtlMs > 0)
        return serverTtlMs;
    return FALLBACK_READ_CACHE_TTL_MS;
}
export function getCacheMode(options) {
    return options.cache || "default";
}
export function getEffectiveTtlMs(options) {
    const ttlMs = parseMs(options.ttlMs);
    return ttlMs !== null ? ttlMs : getDefaultReadCacheTtlMs();
}
export function shouldInvalidateExactEntry(options) {
    return parseMs(options.ttlMs) === 0;
}
export function allowsLiveRead(options) {
    return getCacheMode(options) !== "useCacheOnly";
}
export function isEntryFresh(entry, options) {
    const ttlMs = getEffectiveTtlMs(options);
    if (!Number.isFinite(ttlMs) || ttlMs <= 0)
        return false;
    return Date.now() - entry.cachedAt <= ttlMs;
}
export function getEntryAgeMs(entry, nowMs = Date.now()) {
    return entry ? Math.max(0, nowMs - Number(entry.cachedAt || nowMs)) : null;
}
