"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoCache = void 0;
exports.withMemoCache = withMemoCache;
/**
 * Small in-memory TTL cache used internally by each domain's fetchers.
 * Deliberately not exposed as a public export or made injectable/pluggable
 * yet (e.g. IndexedDB for the web, chrome.storage.local for the extension)
 * — real caching behavior today, per the "design for the future, don't
 * build it early" principle already established in extensionPlan.md; swap
 * for a persistent backend once a consumer actually needs state to survive
 * a reload, not before.
 */
class MemoCache {
    constructor(ttlMs) {
        this.ttlMs = ttlMs;
        this.store = new Map();
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value) {
        this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }
    delete(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}
exports.MemoCache = MemoCache;
async function withMemoCache(cache, key, load) {
    const cached = cache.get(key);
    if (cached !== undefined)
        return cached;
    const value = await load();
    cache.set(key, value);
    return value;
}
