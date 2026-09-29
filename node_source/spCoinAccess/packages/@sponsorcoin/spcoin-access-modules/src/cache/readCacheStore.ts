import type { CacheEntry, ClearCacheResult, SetCacheTraceModeResult } from "./types";
import { normalizeAddress } from "./readCacheKeys";

const cache = new Map<string, CacheEntry>();
const dependencyIndex = new Map<string, Set<string>>();
let globalCacheTraceMode = false;

function indexEntry(key: string, dependencies: Set<string>) {
  for (const dependency of dependencies) {
    if (!dependencyIndex.has(dependency)) dependencyIndex.set(dependency, new Set());
    dependencyIndex.get(dependency)?.add(key);
  }
}

function unindexEntry(key: string) {
  const entry = cache.get(key);
  if (!entry) return;
  for (const dependency of entry.dependencies) {
    const keys = dependencyIndex.get(dependency);
    keys?.delete(key);
    if (keys?.size === 0) dependencyIndex.delete(dependency);
  }
}

export function getCacheEntry(key: string): CacheEntry | undefined {
  return cache.get(key);
}

export function setCacheEntry(key: string, value: unknown, dependencies: Set<string>) {
  unindexEntry(key);
  cache.set(key, { value, cachedAt: Date.now(), dependencies });
  indexEntry(key, dependencies);
}

export function invalidateReadCacheEntry(key: string): number {
  if (!cache.has(key)) return 0;
  unindexEntry(key);
  cache.delete(key);
  return 1;
}

export function invalidateReadCacheByDependency(dependency: string): number {
  const keys = Array.from(dependencyIndex.get(dependency) || []);
  for (const key of keys) {
    invalidateReadCacheEntry(key);
  }
  return keys.length;
}

export function invalidateReadCacheByDependencies(dependencies: Iterable<string>): number {
  const keys = new Set<string>();
  for (const dependency of dependencies) {
    for (const key of dependencyIndex.get(dependency) || []) {
      keys.add(key);
    }
  }
  for (const key of keys) {
    invalidateReadCacheEntry(key);
  }
  return keys.size;
}

export function invalidateReadCacheForAccount(accountKey: string): number {
  return invalidateReadCacheByDependency(`account:${normalizeAddress(accountKey)}`);
}

export function invalidateReadCacheForContract(contractAddress: string, chainId = "unknown-chain"): number {
  return invalidateReadCacheByDependency(`contract:${String(chainId)}:${normalizeAddress(contractAddress)}`);
}

export function clearReadCache(): void {
  cache.clear();
  dependencyIndex.clear();
}

export function clearCache(): ClearCacheResult {
  const entriesBefore = cache.size;
  clearReadCache();
  return {
    cleared: true,
    entriesBefore,
    entriesAfter: cache.size,
  };
}

export function getReadCacheSize(): number {
  return cache.size;
}

export function getCacheTraceMode(): boolean {
  return globalCacheTraceMode;
}

export function setCacheTraceMode(enabled: boolean): SetCacheTraceModeResult {
  globalCacheTraceMode = Boolean(enabled);
  return { cacheTraceMode: globalCacheTraceMode };
}
