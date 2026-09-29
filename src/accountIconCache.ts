// File: src/accountIconCache.ts
// 2026-09-17 — thinned to a one-line instantiation of the shared
// chrome.storage.local-backed cache factory (src/iconCache.ts), once this
// file was confirmed byte-identical to networkIconCache.ts/
// tokenIconCache.ts in everything except its storage key and fetch
// function. See iconCache.ts's own doc comment for the full mechanism/
// reasoning this file used to carry directly.

import { fetchAccountAvatarBlob } from '@sponsorcoin/spcoin-feeds/accounts';
import { createIconCache } from './iconCache';

export const getCachedAccountIconDataUrl = createIconCache(
  'spcoin_account_icon_cache',
  fetchAccountAvatarBlob,
  'account',
);
