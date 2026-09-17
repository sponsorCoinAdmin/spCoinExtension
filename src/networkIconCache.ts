// File: src/networkIconCache.ts
// 2026-09-16, on request ("icons should be read and also stored in a
// cache") — same chrome.storage.local approach as openTargetStorage.ts/
// meritWalletUiStorage.ts, and for the same underlying reason: a Chrome
// side panel's whole JS context (any in-memory cache included) is torn
// down on close and rebuilt from scratch on the next open, so an
// in-memory cache would never actually persist across that boundary. This
// is genuinely the extension's own concern, not spcoin-feeds' — that
// package's fetchNetworkIconBlob (below) is deliberately just a plain
// fetch, since it also has to stay usable by the web app, which has no
// chrome.storage API at all.
//
// Cached as a base64 data URL, not a Blob or object URL — chrome.storage
// can only persist JSON-serializable values, and an object URL wouldn't
// survive a context teardown either way (same reasoning as above).

import { fetchNetworkIconBlob } from '@sponsorcoin/spcoin-feeds/networks';

const STORAGE_KEY = 'spcoin_network_icon_cache';
// Icons change rarely (a chain rebranding its logo is a real but very
// infrequent event) — 24h balances "don't re-fetch every single side-panel
// open" against "don't serve a genuinely stale icon forever". The header's
// own refresh button (wired in sidepanel.ts) bypasses this entirely via
// forceRefresh, for whenever 24h isn't good enough.
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
// images") — this used to be a plain read-modify-write with no
// serialization: every icon on a list fetches (and so writes) in
// parallel via Promise.all, and a later write landing before an earlier
// one's own read had captured it silently discarded that earlier entry
// (last writer wins on the whole cache blob, not a per-key merge).
// Chaining every write through one module-level promise makes each
// write's own read-modify-write wait for the previous write to fully
// land first, closing the race. (Same fix applied to accountIconCache.ts/
// tokenIconCache.ts — identical pattern, identical race.)
let writeQueue: Promise<void> = Promise.resolve();
function writeCacheEntry(logoURL: string, entry: IconCacheEntry): Promise<void> {
  const result = writeQueue.then(async () => {
    const current = await readCache();
    await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, [logoURL]: entry } });
  });
  // The chain itself must always settle to resolved (even when this
  // particular write failed — e.g. quota exceeded) or every write queued
  // after it would inherit that rejection and never run at all. The
  // caller still gets the real per-write outcome via `result`.
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
export async function getCachedNetworkIconDataUrl(
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
    const blob = await fetchNetworkIconBlob(logoURL, { baseUrl });
    dataUrl = await blobToDataUrl(blob);
  } catch (error) {
    console.error(`Failed to fetch network icon ${logoURL}:`, error);
    return undefined;
  }

  // 2026-09-16, on live report ("you are not pulling in all the avatar
  // images") — caching is best-effort AND fire-and-forget from here on.
  // It used to `await` the write before returning, inside the same
  // try/catch as the fetch above — two separate problems: (1) a
  // cache-write failure (full chrome.storage.local quota, or the write
  // race writeCacheEntry's own doc comment fixed) discarded an image that
  // had already been fetched successfully, and (2) once that race was
  // fixed by serializing writes, a whole list's worth of rows (e.g. 30+
  // recipient avatars, each fetched in parallel via Promise.all) would
  // each block their OWN render on waiting for every earlier write in the
  // now-serial queue to finish first — genuinely correct, but slow enough
  // live that most rows still hadn't rendered an icon within a normal
  // wait/observation window. Not awaiting the write at all means every
  // row renders the moment ITS OWN fetch resolves, independent of how
  // many other writes are still queued; the write still happens, just
  // without blocking anything on it.
  void writeCacheEntry(logoURL, { dataUrl, cachedAt: Date.now() }).catch((error) => {
    console.error(`Failed to cache network icon ${logoURL} (still rendered it this time):`, error);
  });
  return dataUrl;
}
