import { normalizeAddress } from "./readCacheKeys";
const cache = new Map();
const dependencyIndex = new Map();
let globalCacheTraceMode = false;
function indexEntry(key, dependencies) {
    for (const dependency of dependencies) {
        if (!dependencyIndex.has(dependency))
            dependencyIndex.set(dependency, new Set());
        dependencyIndex.get(dependency)?.add(key);
    }
}
function unindexEntry(key) {
    const entry = cache.get(key);
    if (!entry)
        return;
    for (const dependency of entry.dependencies) {
        const keys = dependencyIndex.get(dependency);
        keys?.delete(key);
        if (keys?.size === 0)
            dependencyIndex.delete(dependency);
    }
}
export function getCacheEntry(key) {
    return cache.get(key);
}
export function setCacheEntry(key, value, dependencies) {
    unindexEntry(key);
    cache.set(key, { value, cachedAt: Date.now(), dependencies });
    indexEntry(key, dependencies);
}
export function invalidateReadCacheEntry(key) {
    if (!cache.has(key))
        return 0;
    unindexEntry(key);
    cache.delete(key);
    return 1;
}
export function invalidateReadCacheByDependency(dependency) {
    const keys = Array.from(dependencyIndex.get(dependency) || []);
    for (const key of keys) {
        invalidateReadCacheEntry(key);
    }
    return keys.length;
}
export function invalidateReadCacheByDependencies(dependencies) {
    const keys = new Set();
    for (const dependency of dependencies) {
        for (const key of dependencyIndex.get(dependency) || []) {
            keys.add(key);
        }
    }
    for (const key of keys) {
        invalidateReadCacheEntry(key);
    }
    return keys.size;
}
export function invalidateReadCacheForAccount(accountKey) {
    return invalidateReadCacheByDependency(`account:${normalizeAddress(accountKey)}`);
}
export function invalidateReadCacheForContract(contractAddress, chainId = "unknown-chain") {
    return invalidateReadCacheByDependency(`contract:${String(chainId)}:${normalizeAddress(contractAddress)}`);
}
export function clearReadCache() {
    cache.clear();
    dependencyIndex.clear();
}
export function clearCache() {
    const entriesBefore = cache.size;
    clearReadCache();
    return {
        cleared: true,
        entriesBefore,
        entriesAfter: cache.size,
    };
}
export function getReadCacheSize() {
    return cache.size;
}
export function getCacheTraceMode() {
    return globalCacheTraceMode;
}
export function setCacheTraceMode(enabled) {
    globalCacheTraceMode = Boolean(enabled);
    return { cacheTraceMode: globalCacheTraceMode };
}
