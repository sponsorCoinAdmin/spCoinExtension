// File: src/iconCache.ts
// 2026-09-17, cleanup pass — accountIconCache.ts/networkIconCache.ts/
// tokenIconCache.ts were confirmed byte-identical in every dimension
// except their storage key and which spcoin-feeds fetch function they
// wrap: same 24h TTL, same IconCacheEntry/IconCacheMap shape, same
// write-queue serialization fix (2026-09-16, "you are not pulling in all
// the avatar images" — a plain read-modify-write raced under Promise.all,
// last writer silently dropping earlier entries; fixed by chaining every
// write through one module-level promise per cache), same fire-and-forget
// write reasoning, same blobToDataUrl helper. Genuinely this extension's
// own concern, not spcoin-feeds' — each `fetchBlob` passed in below stays a
// plain fetch there, since it also has to stay usable by the web app,
// which has no chrome.storage API at all. Cached as a base64 data URL, not
// a Blob or object URL — chrome.storage can only persist JSON-serializable
// values, and an object URL wouldn't survive a side panel's context
// teardown-on-close either way (the same reason an in-memory cache alone
// was never viable here).

const ICON_CACHE_TTL_MS = 24 * 60 * 60_000;

interface IconCacheEntry {
  dataUrl: string;
  cachedAt: number;
}

type IconCacheMap = Record<string, IconCacheEntry>;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Builds one cache-first `getCachedIconDataUrl(url, baseUrl, forceRefresh?)`
 * function backed by `chrome.storage.local` under `storageKey`, wrapping
 * `fetchBlob` (a plain spcoin-feeds fetch function). `label` only affects
 * the two `console.error` messages' wording (e.g. "account"/"network"/
 * "token"), matching each call site's own pre-existing log text.
 *
 * Cache-first: returns the persisted data URL if this url was already
 * fetched before (across any number of prior side-panel opens) and it's
 * still within ICON_CACHE_TTL_MS, otherwise fetches it for real, caches
 * it, and returns it. Pass forceRefresh (wired to the header's own
 * refresh button) to skip a still-fresh cache entry and re-fetch anyway.
 * Resolves to undefined (never throws) on a real fetch failure — a
 * missing icon shouldn't break the row it belongs to.
 */
export function createIconCache(
  storageKey: string,
  fetchBlob: (url: string, config: { baseUrl: string }) => Promise<Blob>,
  label: string,
) {
  async function readCache(): Promise<IconCacheMap> {
    const stored = await chrome.storage.local.get(storageKey);
    const value = stored[storageKey];
    return value && typeof value === 'object' ? (value as IconCacheMap) : {};
  }

  let writeQueue: Promise<void> = Promise.resolve();
  function writeCacheEntry(url: string, entry: IconCacheEntry): Promise<void> {
    const result = writeQueue.then(async () => {
      const current = await readCache();
      await chrome.storage.local.set({ [storageKey]: { ...current, [url]: entry } });
    });
    // The chain itself must always settle to resolved (even when this
    // particular write failed — e.g. quota exceeded) or every write queued
    // after it would inherit that rejection and never run at all. The
    // caller still gets the real per-write outcome via `result`.
    writeQueue = result.catch(() => undefined);
    return result;
  }

  return async function getCachedIconDataUrl(
    url: string,
    baseUrl: string,
    forceRefresh = false,
  ): Promise<string | undefined> {
    if (!forceRefresh) {
      const cache = await readCache();
      const cached = cache[url];
      if (cached && Date.now() - cached.cachedAt < ICON_CACHE_TTL_MS) return cached.dataUrl;
    }

    let dataUrl: string;
    try {
      const blob = await fetchBlob(url, { baseUrl });
      dataUrl = await blobToDataUrl(blob);
    } catch (error) {
      console.error(`Failed to fetch ${label} icon ${url}:`, error);
      return undefined;
    }

    // Caching is best-effort AND fire-and-forget from here — a cache-write
    // failure must not discard an already-fetched icon, and awaiting the
    // now-serialized write would block every row in a large list (e.g.
    // 30+ recipient avatars, each fetched in parallel) behind however many
    // writes are already queued ahead of it. Not awaiting means every row
    // renders the moment ITS OWN fetch resolves; the write still happens,
    // just without blocking anything on it.
    void writeCacheEntry(url, { dataUrl, cachedAt: Date.now() }).catch((error) => {
      console.error(`Failed to cache ${label} icon ${url} (still rendered it this time):`, error);
    });
    return dataUrl;
  };
}
