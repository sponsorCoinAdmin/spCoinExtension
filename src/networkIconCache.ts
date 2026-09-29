// File: src/networkIconCache.ts
// 2026-09-17 — thinned to a one-line instantiation of the shared
// chrome.storage.local-backed cache factory (src/iconCache.ts), once this
// file was confirmed byte-identical to accountIconCache.ts/
// tokenIconCache.ts in everything except its storage key and fetch
// function. See iconCache.ts's own doc comment for the full mechanism/
// reasoning this file used to carry directly.

import { fetchNetworkIconBlob } from '@sponsorcoin/spcoin-feeds/networks';
import { createIconCache } from './iconCache';

export const getCachedNetworkIconDataUrl = createIconCache(
  'spcoin_network_icon_cache',
  fetchNetworkIconBlob,
  'network',
);
