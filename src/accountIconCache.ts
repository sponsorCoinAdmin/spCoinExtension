// File: src/accountIconCache.ts
// 2026-09-29 — createIconCache itself moved to @sponsorcoin/spcoin-feeds/
// shared (portable — any consumer can use it, not just this extension); this
// file now just supplies this extension's own chrome.storage.local backend
// (chromeIconCacheStorage.ts) as the 4th argument. Behavior unchanged.

import { fetchAccountAvatarBlob } from '@sponsorcoin/spcoin-feeds/accounts';
import { createIconCache } from '@sponsorcoin/spcoin-feeds/shared';
import { chromeIconCacheStorage } from './chromeIconCacheStorage';

export const getCachedAccountIconDataUrl = createIconCache(
  'spcoin_account_icon_cache',
  fetchAccountAvatarBlob,
  'account',
  chromeIconCacheStorage,
);
