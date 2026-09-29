export const FALLBACK_READ_CACHE_TTL_MS = 10000;
export function isReadCacheOptions(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const record = value;
    return ("cache" in record ||
        "cacheNamespace" in record ||
        "blockTag" in record ||
        "ttlMs" in record ||
        "traceCache" in record ||
        "timestampOverride" in record);
}
export function splitReadCacheOptions(args) {
    const nextArgs = [...args];
    const last = nextArgs[nextArgs.length - 1];
    if (isReadCacheOptions(last)) {
        nextArgs.pop();
        return { args: nextArgs, options: last };
    }
    return { args: nextArgs, options: {} };
}
