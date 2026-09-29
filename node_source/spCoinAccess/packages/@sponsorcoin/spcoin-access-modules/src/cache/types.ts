export type SpCoinReadCacheMode = "default" | "forceRefresh" | "useCacheOnly";

export const FALLBACK_READ_CACHE_TTL_MS = 10_000;

export interface SpCoinReadCacheOptions {
  cache?: SpCoinReadCacheMode;
  cacheNamespace?: string;
  blockTag?: "latest" | "pending" | number;
  ttlMs?: number;
  traceCache?: boolean;
  timestampOverride?: string | number | bigint;
}

export function isReadCacheOptions(value: unknown): value is SpCoinReadCacheOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    "cache" in record ||
    "cacheNamespace" in record ||
    "blockTag" in record ||
    "ttlMs" in record ||
    "traceCache" in record ||
    "timestampOverride" in record
  );
}

export function splitReadCacheOptions(args: unknown[]): {
  args: unknown[];
  options: SpCoinReadCacheOptions;
} {
  const nextArgs = [...args];
  const last = nextArgs[nextArgs.length - 1];
  if (isReadCacheOptions(last)) {
    nextArgs.pop();
    return { args: nextArgs, options: last };
  }
  return { args: nextArgs, options: {} };
}

export interface CacheEntry {
  value: unknown;
  cachedAt: number;
  dependencies: Set<string>;
}

export interface ProviderScopeInfo {
  chainId: string;
  contractAddress: string;
  providerType: string;
  runnerType: string;
  rpcUrl: string;
  scopeSource: string;
}

export interface ClearCacheResult {
  cleared: true;
  entriesBefore: number;
  entriesAfter: number;
}

export interface SetCacheTraceModeResult {
  cacheTraceMode: boolean;
}
