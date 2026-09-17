/**
 * Small in-memory TTL cache used internally by each domain's fetchers.
 * Deliberately not exposed as a public export or made injectable/pluggable
 * yet (e.g. IndexedDB for the web, chrome.storage.local for the extension)
 * — real caching behavior today, per the "design for the future, don't
 * build it early" principle already established in extensionPlan.md; swap
 * for a persistent backend once a consumer actually needs state to survive
 * a reload, not before.
 */
export class MemoCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export async function withMemoCache<T>(
  cache: MemoCache<T>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const value = await load();
  cache.set(key, value);
  return value;
}
