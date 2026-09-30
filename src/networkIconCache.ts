// File: src/networkIconCache.ts
// 2026-09-29 — createIconCache itself moved to @sponsorcoin/spcoin-feeds/
// shared (portable — any consumer can use it, not just this extension); this
// file now just supplies this extension's own chrome.storage.local backend
// (chromeIconCacheStorage.ts) as the 4th argument. Behavior unchanged.

import { fetchNetworkIconBlob } from '@sponsorcoin/spcoin-feeds/networks';
import { createIconCache } from '@sponsorcoin/spcoin-feeds/shared';
import { chromeIconCacheStorage } from './chromeIconCacheStorage';

export const getCachedNetworkIconDataUrl = createIconCache(
  'spcoin_network_icon_cache',
  fetchNetworkIconBlob,
  'network',
  chromeIconCacheStorage,
);
