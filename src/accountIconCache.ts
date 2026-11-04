// File: src/accountIconCache.ts
// 2026-11-04 (owner decision): the extension's account avatar cache is the avatars section of the ONE image cache the wallet component uses (createMeritWalletIconCaches, one instance per storage). It was a second cache of its own on the same storage key.
import { createMeritWalletIconCaches } from '@sponsorcoin/merit-wallet';
import { chromeIconCacheStorage } from './chromeIconCacheStorage';

export const getCachedAccountIconDataUrl = createMeritWalletIconCaches(chromeIconCacheStorage).getCachedAccountIconDataUrl;
