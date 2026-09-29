// File: src/chromeIconCacheStorage.ts
// 2026-09-29 — this extension's own IconCacheStorage backend
// (@sponsorcoin/spcoin-feeds/shared), wrapping chrome.storage.local. The
// portable factory moved to spcoin-feeds so the web app (and eventually a
// native mobile app) can use the same real caching mechanism with their own
// storage backend — chrome.storage.local only exists in a Chrome extension,
// so it stays here, not in the shared package. Behavior is unchanged from
// the old src/iconCache.ts this replaces — same storage shape, same calls.

import type { IconCacheStorage, IconCacheMap } from '@sponsorcoin/spcoin-feeds/shared';

export const chromeIconCacheStorage: IconCacheStorage = {
  async get(storageKey) {
    const stored = await chrome.storage.local.get(storageKey);
    const value = stored[storageKey];
    return value && typeof value === 'object' ? (value as IconCacheMap) : undefined;
  },
  async set(storageKey, value) {
    await chrome.storage.local.set({ [storageKey]: value });
  },
};
