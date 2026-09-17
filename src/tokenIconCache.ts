// File: src/tokenIconCache.ts
// 2026-09-16, on request ("find the icons like the web page finds them and
// put them in the list like TokenListDropDown and AccountListDropDown") —
// same chrome.storage.local approach as networkIconCache.ts/
// accountIconCache.ts, same underlying reason: a Chrome side panel's whole
// JS context (any in-memory cache included) is torn down on close and
// rebuilt from scratch on the next open. Genuinely this extension's own
// concern, not spcoin-feeds' — that package's fetchTokenIconBlob (below) is
// deliberately just a plain fetch, since it also has to stay usable by the
// web app, which has no chrome.storage API at all.
//
// Cached as a base64 data URL, not a Blob or object URL — chrome.storage
// can only persist JSON-serializable values, and an object URL wouldn't
// survive a context teardown either way (same reasoning as above).

import { fetchTokenIconBlob } from '@sponsorcoin/spcoin-feeds/tokens';

const STORAGE_KEY = 'spcoin_token_icon_cache';
// Same 24h TTL as networkIconCache.ts/accountIconCache.ts, same reasoning.
const ICON_CACHE_TTL_MS = 24 * 60 * 60_000;

interface IconCacheEntry {
  dataUrl: string;
  cachedAt: number;
}

type IconCacheMap = Record<string, IconCacheEntry>;

async function readCache(): Promise<IconCacheMap> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  return value && typeof value === 'object' ? (value as IconCacheMap) : {};
}

// 2026-09-16, on live report ("you are not pulling in all the avatar
// images") — see networkIconCache.ts's own identical fix for the full
// reasoning (same read-modify-write race across concurrent Promise.all
// writes, same fix — serialize every write through one module-level
// promise chain).
let writeQueue: Promise<void> = Promise.resolve();
function writeCacheEntry(logoURL: string, entry: IconCacheEntry): Promise<void> {
  const result = writeQueue.then(async () => {
    const current = await readCache();
    await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, [logoURL]: entry } });
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/** Cache-first: returns the persisted data URL if we've already fetched
 *  this logoURL before (across any number of prior side-panel opens) and
 *  it's still within ICON_CACHE_TTL_MS, otherwise fetches it for real via
 *  spcoin-feeds, caches it, and returns it. Pass forceRefresh (wired to the
 *  header's own refresh button) to skip a still-fresh cache entry and
 *  re-fetch anyway. Returns undefined (never throws) on a real fetch
 *  failure — a missing icon shouldn't break the row it belongs to. */
export async function getCachedTokenIconDataUrl(
  logoURL: string,
  baseUrl: string,
  forceRefresh = false,
): Promise<string | undefined> {
  if (!forceRefresh) {
    const cache = await readCache();
    const cached = cache[logoURL];
    if (cached && Date.now() - cached.cachedAt < ICON_CACHE_TTL_MS) return cached.dataUrl;
  }

  let dataUrl: string;
  try {
    const blob = await fetchTokenIconBlob(logoURL, { baseUrl });
    dataUrl = await blobToDataUrl(blob);
  } catch (error) {
    console.error(`Failed to fetch token icon ${logoURL}:`, error);
    return undefined;
  }

  // Caching is best-effort AND fire-and-forget from here — see
  // networkIconCache.ts's identical fix for the full reasoning (a
  // cache-write failure must not discard an already-fetched icon, and
  // awaiting the now-serialized write would block every row in a large
  // list behind however many writes are already queued ahead of it).
  void writeCacheEntry(logoURL, { dataUrl, cachedAt: Date.now() }).catch((error) => {
    console.error(`Failed to cache token icon ${logoURL} (still rendered it this time):`, error);
  });
  return dataUrl;
}
